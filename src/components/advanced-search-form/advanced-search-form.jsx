import { useEffect, useState } from 'react';
import { useEvent } from 'react-use-event-hook';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { useMediaQuery } from '../hooks/media-query';
import { ButtonLink } from '../button-link';
import { Icon } from '../fontawesome-icons';
import style from './advanced-search-form.module.scss';
import { BoolInput } from './bool-input';
import { ChooseInput } from './choose-input';
import { Columns } from './columns';
import { IntervalInput } from './interval-input';
import { Section } from './section';
import { TextInput } from './text-input';

export function AdvancedSearchForm() {
  const isWideScreen = useMediaQuery('(min-width: 768px)');
  const [formExpanded, setFormExpanded] = useState(false);
  const [docsExpanded, setDocsExpanded] = useState(false);

  const expandForm = useEvent(() => setFormExpanded(true));
  const expandDocs = useEvent(() => setDocsExpanded(true));

  useEffect(() => {
    if (isWideScreen) {
      setFormExpanded(false);
      setDocsExpanded(false);
    }
  }, [isWideScreen]);

  const showFullForm = isWideScreen || formExpanded;
  const showFullDocs = isWideScreen || docsExpanded;

  return (
    <div className={style.form}>
      <Section title="What to search">
        <input type="search" name="q" className="form-control" placeholder="Text to search" />
        <div className={style.searchScopes}>
          Search for:
          <label>
            <input type="checkbox" /> posts
          </label>
          <label>
            <input type="checkbox" /> comments
          </label>
        </div>
      </Section>
      <Section title="Search only in">
        <Columns>
          <BoolInput label="My friends and groups" />
          <BoolInput label="My discussions" />
          <BoolInput label="My posts" />
          <BoolInput label="My direct messages" />
          <BoolInput label="My saved posts" />
          <BoolInput label="All content written by me" />
        </Columns>
      </Section>
      <Section title="With conditions">
        <Columns>
          <TextInput label="Content written by users" placeholder="user1, user2" />
          <TextInput label="Posts written by users" placeholder="user1, user2" />
          <TextInput label="Posts commented by users" placeholder="user1, user2" />
          <TextInput label="Posts created after" type="date" />
          <TextInput label="Posts created before" type="date" />
          <TextInput label="Specific groups" placeholder="group1, group2" />
          {showFullForm ? (
            <>
              <ChooseInput label="Posts with privacy">
                <option value="">Any</option>
                <option value="public">Public</option>
                <option value="protected">Protected</option>
                <option value="private">Private</option>
              </ChooseInput>
              <ChooseInput label="Posts with attachments">
                <option value="">With or without</option>
                <option value="images">Images</option>
                <option value="audio">Audio</option>
                <option value="files">Any files</option>
              </ChooseInput>
              <IntervalInput label="Post comments count" />
              <TextInput label="Posts liked by users" placeholder="user1, user2" />
              <IntervalInput label="Post likes count" />
              <TextInput label="Comments liked by users" placeholder="user1, user2" />
              <IntervalInput label="Comment likes count" />
            </>
          ) : null}
        </Columns>
      </Section>
      {showFullForm ? (
        <Section title="Exclusions">
          <Columns>
            <TextInput label="Exclude posts written by users" placeholder="user1, user2" />
            <TextInput label="Exclude posts created after" type="date" />
            <TextInput label="Exclude posts created before" type="date" />
            <TextInput label="Exclude specific groups" placeholder="group1, group2" />
            <TextInput label="Exclude posts commented by users" placeholder="user1, user2" />
            <ChooseInput label="Exclude posts with attachments">
              <option value="">Don&#x2019;t exclude</option>
              <option value="images">Images</option>
              <option value="audio">Audio</option>
              <option value="files">Any files</option>
            </ChooseInput>
            <ChooseInput label="Exclude posts with privacy">
              <option value="">Any</option>
              <option value="public">Public</option>
              <option value="protected">Protected</option>
              <option value="private">Private</option>
            </ChooseInput>
          </Columns>
        </Section>
      ) : null}
      {!showFullForm ? (
        <p>
          <ButtonLink onClick={expandForm}>
            <Icon icon={faChevronDown} className={style.expandIcon} /> Show all conditions
          </ButtonLink>
        </p>
      ) : null}
      <Section sticky>
        <button type="button" className="btn btn-primary col-sm-4 col-xs-12">
          Search
        </button>
      </Section>
      <p>
        Search query: <code>foo bar</code>
      </p>
      {showFullDocs ? (
        <>
          {' '}
          <p>
            Use double-quotes to search words in the exact form and specific word order:{' '}
            <em>&quot;freefeed version&quot;</em>
            <br />
            Use the asterisk symbol (<code>*</code>) to search word by prefix: <em>free*</em>. The
            minimum prefix length is two characters.
            <br />
            Use the pipe symbol (<code>|</code>) between words to search any of them:{' '}
            <em>freefeed | version</em>
            <br />
            Use the minus sign (<code>-</code>) to exclude some word from search results:{' '}
            <em>freefeed -version</em>
            <br />
            Use the plus sign (<code>+</code>) to specify word order: <em>freefeed + version</em>
            <br />
          </p>
          <p>
            Learn the{' '}
            <a
              href="https://github.com/FreeFeed/freefeed-server/wiki/FreeFeed-Search"
              target="_blank"
            >
              full query syntax
            </a>{' '}
            for more advanced search requests.
          </p>
        </>
      ) : (
        <>
          <p>
            Use double-quotes to search words in the exact form and specific word order:{' '}
            <em>&quot;freefeed version&quot;</em>
            <br />
            Use the asterisk symbol (<code>*</code>) to search word by prefix: <em>free*</em>. The
            minimum prefix length is two characters.
          </p>
          <p>
            <ButtonLink onClick={expandDocs}>
              <Icon icon={faChevronDown} className={style.expandIcon} /> Show search query syntax
              help
            </ButtonLink>
          </p>
        </>
      )}
    </div>
  );
}
