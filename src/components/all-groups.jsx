/* global CONFIG */
import { memo, useEffect, useMemo, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { sortBy, range, omit, debounce } from 'lodash';
import { Link } from 'react-router';
import { Helmet } from 'react-helmet';
import cn from 'classnames';

import { faCaretDown, faUserFriends, faCheck } from '@fortawesome/free-solid-svg-icons';
import { getAllGroups } from '../redux/action-creators';
import { Icon } from './fontawesome-icons';

import UserName from './user-name';
import TimeDisplay from './time-display';

import styles from './all-groups.module.scss';
import { UserPicture } from './user-picture';
import { HorScrollable } from './hor-scrollable';

export default function AllGroups({ router }) {
  const dispatch = useDispatch();
  const status = useSelector((state) => state.allGroupsStatus);

  useEffect(
    () => void (status.success || status.loading || dispatch(getAllGroups())),
    [dispatch, status],
  );

  return (
    <div className="content">
      <Helmet title={`All Groups - ${CONFIG.siteTitle}`} defer={false} />
      <div className="box">
        <div className="box-header-timeline" role="heading">
          All Groups
        </div>
        <div className="box-body">
          <div className="row" style={{ marginBottom: 20 }}>
            <div className="col-md-6">
              <Link to="/groups">List of your groups</Link>
            </div>
            <div className="col-md-6 text-right">
              <Link to="/groups/create">Create a group</Link>
            </div>
          </div>

          {status.loading && <p>Loading...</p>}
          {status.error && (
            <p className="alert alert-danger">Can not load groups list: {status.errorText}</p>
          )}
          {status.success && <GroupsList pageSize={50} routerReplace={router.replace} />}
        </div>
      </div>
    </div>
  );
}

const SORT_BY_SUBSCRIBERS = 'subscribers';
const SORT_BY_POSTS = 'posts';
const SORT_BY_VARIETY = 'variety';
const SORT_BY_DATE = 'date';
const SORT_DEFAULT = SORT_BY_SUBSCRIBERS;

const sortFields = {
  [SORT_BY_POSTS]: 'postsByMonth',
  [SORT_BY_SUBSCRIBERS]: 'subscribers',
  [SORT_BY_VARIETY]: 'authorsVariety',
  [SORT_BY_DATE]: 'createdAt',
};

function GroupsList({ pageSize, routerReplace }) {
  const location = useSelector((state) => state.routing.locationBeforeTransitions);
  const { groups, withProtected } = useSelector((state) => state.allGroups);
  const user = useSelector((state) => state.user);

  const [nameFilter, setNameFilter] = useState(location.query.q || '');

  const nameFilterLowercase = nameFilter.toLowerCase();
  const filteredGroups = nameFilter
    ? groups.filter((g) => {
        return (
          g.username.toLowerCase().includes(nameFilterLowercase) ||
          g.screenName.toLowerCase().includes(nameFilterLowercase)
        );
      })
    : groups;

  const page = getPageNumber(location);
  const sort = getSortMode(location);
  const totalPages = Math.ceil(filteredGroups.length / pageSize);

  const groupsOnPage = useMemo(
    () =>
      sortBy(filteredGroups, sortFields[sort])
        .reverse()
        .slice(page * pageSize, (page + 1) * pageSize),
    [filteredGroups, page, pageSize, sort],
  );

  const clearSearchForm = useCallback(() => setNameFilter(''), []);

  const debuncedReplace = useMemo(() => debounce(routerReplace, 200), [routerReplace]);

  useEffect(() => {
    if (nameFilter !== (location.query.q || '')) {
      const query = omit(location.query, 'page', 'q');
      if (nameFilter !== '') {
        query.q = nameFilter;
      }
      debuncedReplace({ ...location, query });
    }
  }, [debuncedReplace, nameFilter, location]);

  return (
    <>
      {withProtected ? (
        <p>
          There are {groups.length} public and protected groups in {CONFIG.siteTitle}. Protected
          groups can only be seen by authenticated users.
        </p>
      ) : (
        <p>
          There are {groups.length} public groups in {CONFIG.siteTitle}.
        </p>
      )}
      <p>
        Checkmark icon <Icon className="text-muted small" icon={faCheck} /> in Subscribers column
        indicates that you already are subscribed to that group. Values in Authors variety column
        show how many different authors wrote to a group in the last few months.
      </p>
      <p>
        <label htmlFor="groups-name-filter">Filter by username or display name</label>
      </p>
      <p className="form-inline">
        <input
          id="groups-name-filter"
          type="search"
          placeholder="Type to filter"
          value={nameFilter}
          onChange={useCallback((e) => setNameFilter(e.target.value), [])}
          className="form-control narrow-input"
        />
        {nameFilter && (
          <button className="btn btn-link" onClick={clearSearchForm}>
            clear
          </button>
        )}
      </p>

      <HorScrollable>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headersRow}>
              <th className={styles.mainColumn}>Group</th>
              <SortHeader mode={SORT_BY_SUBSCRIBERS} currentMode={sort}>
                Subscribers
              </SortHeader>
              <SortHeader mode={SORT_BY_POSTS} currentMode={sort}>
                Posts
                <br />
                per month
              </SortHeader>
              <SortHeader mode={SORT_BY_VARIETY} currentMode={sort}>
                Authors
                <br />
                variety
              </SortHeader>
              <SortHeader mode={SORT_BY_DATE} currentMode={sort}>
                Created
              </SortHeader>
            </tr>
          </thead>
          <tbody>
            {groupsOnPage.map((g) => {
              const isSubscribed = user.subscriptions.includes(g.id);
              return <GroupRow key={g.id} g={g} isSubscribed={isSubscribed} />;
            })}
          </tbody>
        </table>
      </HorScrollable>
      {groupsOnPage.length === 0 ? (
        <div className={styles.empty}>No groups match current filter</div>
      ) : (
        false
      )}
      {totalPages > 1 && (
        <ul className="pagination">
          {range(1, totalPages).map((n) => (
            <li key={n} className={page === n - 1 ? 'active' : undefined}>
              <Link to={linkToPage(n, location)}>{n}</Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function SortHeader({ children, mode, currentMode }) {
  const location = useSelector((state) => state.routing.locationBeforeTransitions);
  return (
    <th
      className={cn(
        styles.sortableHeader,
        mode !== currentMode && styles.inactive,
        styles[`${mode}Column`],
      )}
    >
      <Link to={linkToSort(mode, location)}>
        {children}
        <Icon icon={faCaretDown} className={styles.caret} />
      </Link>
    </th>
  );
}

const GroupRow = memo(function GroupRow({ g, isSubscribed }) {
  const u = useSelector((state) => state.users[g.id]);
  return (
    <tr className={styles.groupRow}>
      <td>
        <UserPicture user={u} className={styles.userpic} />
        <div className={styles.groupInfo}>
          <UserName user={u}>{u.username}</UserName>
          {u.username !== u.screenName && <div className="small">{u.screenName}</div>}
          {u.isProtected === '1' && (
            <div className="text-muted small">
              <Icon icon={faUserFriends} /> Protected group
            </div>
          )}
        </div>
      </td>
      <td>
        {isSubscribed ? (
          <Icon className="text-muted small" icon={faCheck} title="You are subscribed" />
        ) : (
          false
        )}{' '}
        {g.subscribers}
      </td>
      <td>{g.postsByMonth === 0 ? '< 1' : Math.ceil(g.postsByMonth)}</td>
      <td>{Math.round(g.authorsVariety * 100)}%</td>
      <td>
        <TimeDisplay timeStamp={+u.createdAt} absolute dateOnly />
      </td>
    </tr>
  );
});

function getPageNumber({ query: { page = '1' } }) {
  page = parseInt(page);
  if (!Number.isFinite(page) || page < 1) {
    return 0;
  }
  return page - 1;
}

function getSortMode({ query: { sort = SORT_DEFAULT } }) {
  return sortFields[sort] ? sort : SORT_DEFAULT;
}

function linkToPage(page, { pathname, query }) {
  return {
    pathname,
    query: { ...query, page: page > 1 ? page : undefined },
  };
}

function linkToSort(sort, { pathname }) {
  return {
    pathname,
    query: { sort: sort !== SORT_DEFAULT ? sort : undefined },
  };
}
