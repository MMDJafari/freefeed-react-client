import { describe, it, beforeEach } from 'mocha';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import { spy, stub } from 'sinon';
import { noop } from 'lodash';
import { createStore, applyMiddleware, combineReducers } from 'redux';

import { createRealtimeMiddleware } from '../../../../src/redux/middlewares';
import { user, realtimeSubscriptions } from '../../../../src/redux/reducers';
import {
  REALTIME_CONNECTED,
  REALTIME_INCOMING_EVENT,
  WHO_AM_I,
  SIGN_UP,
  HOME,
  GET_SINGLE_POST,
  GET_EVERYTHING,
  GET_USER_FEED,
} from '../../../../src/redux/action-types';
import {
  realtimeSubscribe,
  realtimeUnsubscribe,
  unauthenticated,
} from '../../../../src/redux/action-creators';
import { delay } from '../../../../src/utils';
import { response, request } from '../../../../src/redux/action-helpers';
import { HOMEFEED_MODE_CLASSIC } from '../../../../src/utils/feed-options';
import { inactivityOf, EventsSequence } from '../../../../src/utils/event-sequences';

const expect = unexpected.clone();
expect.use(unexpectedSinon);

class MockConnection {
  connectHandler = noop;
  eventHandler = noop;

  constructor() {
    this.reAuthorize = stub().returns(Promise.resolve());
    this.subscribeTo = stub().returns(Promise.resolve());
    this.unsubscribeFrom = stub().returns(Promise.resolve());
  }

  onConnect(handler) {
    this.connectHandler = handler;
  }
  onEvent(handler) {
    this.eventHandler = handler;
  }

  async reAuthorize() {}
  async subscribeTo(...rooms) {} // eslint-disable-line no-unused-vars
  async unsubscribeFrom(...rooms) {} // eslint-disable-line no-unused-vars

  triggerEvent(event, data) {
    this.eventHandler(event, data);
  }
  triggerConnect() {
    this.connectHandler();
  }
}

function nextTick() {
  return new Promise((resolve) => process.nextTick(resolve));
}

const CLEAR_STATE = 'test/CLEAR_STATE';
const cleanState = () => ({ type: CLEAR_STATE });

function createSpyMiddleware(theSpy) {
  return () => (next) => (action) => {
    if (action.type !== CLEAR_STATE) {
      theSpy(action);
    }
    next(action);
  };
}

describe('realtime middleware', () => {
  const eventHandlers = { event1: spy() };
  const connection = new MockConnection();
  const actionSpy = spy();

  const reducer = combineReducers({
    user,
    realtimeSubscriptions,
  });
  const cleanableReducer = (state, action) => {
    if (action.type === CLEAR_STATE) {
      state = undefined;
    }
    return reducer(state, action);
  };

  const userActivity = new EventsSequence(50);
  const realtimeMiddleware = (store) =>
    createRealtimeMiddleware(store, connection, eventHandlers, userActivity);

  const store = createStore(
    cleanableReducer,
    applyMiddleware(createSpyMiddleware(actionSpy), realtimeMiddleware),
  );

  beforeEach(() => {
    actionSpy.resetHistory();
    store.dispatch(cleanState());
    Object.values(eventHandlers).forEach((h) => h.resetHistory());
    Object.values(connection).forEach((m) => m.resetHistory && m.resetHistory());
  });

  it('should dispatch REALTIME_CONNECTED on connect', () => {
    connection.triggerConnect();
    expect(actionSpy, 'to have a call satisfying', [{ type: REALTIME_CONNECTED }]);
  });

  it('should dispatch REALTIME_INCOMING_EVENT on incoming event', async () => {
    const [event, data] = ['event', 'some data'];
    connection.triggerEvent(event, data);
    // The REALTIME_INCOMING_EVENT always dispatches asynchronously
    expect(actionSpy, 'was not called');
    await nextTick();
    expect(actionSpy, 'to have a call satisfying', [
      { type: REALTIME_INCOMING_EVENT, payload: { event, data } },
    ]);
  });

  describe('delay during the user activity', () => {
    it('should not dispatch REALTIME_INCOMING_EVENT immediately if scrolling is performed', async () => {
      userActivity.trigger();
      const [event, data] = ['event', 'some data'];
      connection.triggerEvent(event, data);
      await nextTick();
      expect(actionSpy, 'was not called');
    });

    it('should dispatch REALTIME_INCOMING_EVENT after scrolling is stopped', async () => {
      userActivity.trigger();
      const [event, data] = ['event', 'some data'];
      connection.triggerEvent(event, data);
      await inactivityOf(userActivity);
      expect(actionSpy, 'to have a call satisfying', [
        { type: REALTIME_INCOMING_EVENT, payload: { event, data } },
      ]);
    });
  });

  it('should subscribe to room', () => {
    store.dispatch(realtimeSubscribe('room1'));
    const state = store.getState();
    expect(state, 'to satisfy', { realtimeSubscriptions: ['room1'] });
    expect(connection.subscribeTo, 'to have a call satisfying', ['room1']);
  });

  it('should not subscribe to the same room twice', () => {
    store.dispatch(realtimeSubscribe('room1'));
    store.dispatch(realtimeSubscribe('room1'));
    const state = store.getState();
    expect(state, 'to satisfy', { realtimeSubscriptions: ['room1'] });
  });

  it('should unsubscribe from room', () => {
    store.dispatch(realtimeSubscribe('room1'));
    store.dispatch(realtimeSubscribe('room2'));
    store.dispatch(realtimeUnsubscribe('room1'));
    const state = store.getState();
    expect(state, 'to satisfy', { realtimeSubscriptions: ['room2'] });
    expect(connection.unsubscribeFrom, 'to have a call satisfying', ['room1']);
  });

  it('should trigger handler on event without realtimeChannels', async () => {
    const [event, data] = ['event1', {}];
    connection.triggerEvent(event, data);
    await nextTick();
    expect(eventHandlers[event], 'to have a call satisfying', [data]);
  });

  it('should trigger handler on event with realtimeChannels when subscribed', async () => {
    store.dispatch(realtimeSubscribe('room1'));
    const [event, data] = ['event1', { realtimeChannels: ['room1'] }];
    connection.triggerEvent(event, data);
    await nextTick();
    expect(eventHandlers[event], 'to have a call satisfying', [data]);
  });

  it('should not trigger handler on event with realtimeChannels when not subscribed', async () => {
    store.dispatch(realtimeSubscribe('room2'));
    const [event, data] = ['event1', { realtimeChannels: ['room1'] }];
    connection.triggerEvent(event, data);
    await nextTick();
    expect(eventHandlers[event], 'was not called');
  });

  it('should reconnect to all subscribed rooms after socket reconnection', async () => {
    store.dispatch(realtimeSubscribe('room1'));
    store.dispatch(realtimeSubscribe('room2'));
    connection.subscribeTo.resetHistory();

    connection.triggerConnect();
    await delay(); // we are should wait here

    connection.reAuthorize.called || expect.fail('connection.reAuthorize was not called');
    connection.reAuthorize.calledBefore(connection.subscribeTo) ||
      expect.fail('.reAuthorize should be called before .subscribeTo');
    expect(connection.subscribeTo, 'to have a call satisfying', ['room1', 'room2']);
  });

  it(`should unsubscribe from 'user:' rooms on log out`, async () => {
    store.dispatch(realtimeSubscribe('room1'));
    store.dispatch(realtimeSubscribe('room2'));
    store.dispatch(realtimeSubscribe('user:luna'));
    store.dispatch(unauthenticated());
    await delay(); // we are should wait here
    connection.reAuthorize.called || expect.fail('connection.reAuthorize was not called');
    actionSpy.calledWith(realtimeUnsubscribe('user:luna')) ||
      expect.fail('a proper REALTIME_UNSUBSCRIBE action was not dispatched');
    connection.reAuthorize.calledBefore(connection.unsubscribeFrom) ||
      expect.fail('.reAuthorize should be called before .unsubscribeFrom');
  });

  it(`should subscribe to 'user:' room on whoami`, async () => {
    store.dispatch({ type: response(WHO_AM_I), payload: { users: { id: 'luna' } } });
    await delay(); // we are should wait here
    connection.reAuthorize.called || expect.fail('connection.reAuthorize was not called');
    actionSpy.calledWith(realtimeSubscribe('user:luna')) ||
      expect.fail('a proper REALTIME_SUBSCRIBE action was not dispatched');
    connection.reAuthorize.calledBefore(connection.subscribeTo) ||
      expect.fail('.reAuthorize should be called before .subscribeTo');
  });

  it(`should subscribe to 'user:' room on sign up`, async () => {
    store.dispatch({ type: response(SIGN_UP), payload: { users: { id: 'luna' } } });
    await delay(); // we are should wait here
    connection.reAuthorize.called || expect.fail('connection.reAuthorize was not called');
    actionSpy.calledWith(realtimeSubscribe('user:luna')) ||
      expect.fail('a proper REALTIME_SUBSCRIBE action was not dispatched');
    connection.reAuthorize.calledBefore(connection.subscribeTo) ||
      expect.fail('.reAuthorize should be called before .subscribeTo');
  });

  it(`should unsubscribe from any 'post:' rooms on feed request`, async () => {
    store.dispatch(realtimeSubscribe('post:post1'));
    store.dispatch(realtimeSubscribe('post:post2'));
    store.dispatch({ type: request(HOME) });
    await delay(); // we are should wait here
    actionSpy.calledWith(realtimeUnsubscribe('post:post1', 'post:post2')) ||
      expect.fail('a proper REALTIME_UNSUBSCRIBE action was not dispatched');
  });

  it(`should unsubscribe from any 'post:' rooms on post request`, async () => {
    store.dispatch(realtimeSubscribe('post:post1'));
    store.dispatch(realtimeSubscribe('post:post2'));
    store.dispatch({ type: request(GET_SINGLE_POST) });
    await delay(); // we are should wait here
    actionSpy.calledWith(realtimeUnsubscribe('post:post1', 'post:post2')) ||
      expect.fail('a proper REALTIME_UNSUBSCRIBE action was not dispatched');
  });

  it(`should subscribe to user's 'timeline:' room on timeline response`, () => {
    store.dispatch({ type: response(GET_USER_FEED), payload: { timelines: { id: 'userfeed' } } });
    actionSpy.calledWith(realtimeSubscribe('timeline:userfeed')) ||
      expect.fail('a proper REALTIME_SUBSCRIBE action was not dispatched');
  });

  it(`should subscribe to home 'timeline:' room on timeline response`, () => {
    store.dispatch({ type: response(HOME), payload: { timelines: { id: 'home' } } });
    actionSpy.calledWith(
      realtimeSubscribe(`timeline:home?homefeed-mode=${HOMEFEED_MODE_CLASSIC}`),
    ) || expect.fail('a proper REALTIME_SUBSCRIBE action was not dispatched');
  });

  it(`should subscribe to 'post:' room on post response`, () => {
    store.dispatch({ type: response(GET_SINGLE_POST), payload: { posts: { id: 'post' } } });
    actionSpy.calledWith(realtimeSubscribe('post:post')) ||
      expect.fail('a proper REALTIME_SUBSCRIBE action was not dispatched');
  });

  it(`should subscribe to 'post:' rooms on timelineless post collection response`, () => {
    store.dispatch({
      type: response(GET_EVERYTHING),
      payload: { timelines: null, posts: [{ id: 'post1' }, { id: 'post2' }] },
    });
    actionSpy.calledWith(realtimeSubscribe('post:post1', 'post:post2')) ||
      expect.fail('a proper REALTIME_SUBSCRIBE action was not dispatched');
  });
});
