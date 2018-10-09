import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";
import axios from "axios";

const TITLE = "React GraphQL GitHub Client";
const axiosGitHubGraphQL = axios.create({
  baseURL: "https://api.github.com/graphql",
  headers: {
    Authorization: `bearer ${
      process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN
    }`
  }
});

const resolveIssuesQuery = (queryResult, cursor) => state => {
  const { data, errors } = queryResult.data;

  debugger;
  if (!cursor) {
    return {
      organization: data.organization,
      errors
    };
  }

  const { edges: oldIssues } = state.organization.repository.issues;
  const { edges: newIssues } = data.organization.repository.issues;
  const updatedIssues = [...oldIssues, ...newIssues];

  let result = {
    organization: {
      ...data.organization,
      repository: {
        ...data.organization.repository,
        issues: {
          ...data.organization.repository.issues,
          edges: updatedIssues
        }
      }
    },
    errors
  };

  return result;
};

class App extends Component {
  state = {
    path: "the-road-to-learn-react/the-road-to-learn-react",
    organization: null,
    errors: null
  };

  componentDidMount() {
    // fetch data
    this.onFetchFromGitHub(this.state.path);
  }

  onChange = event => {
    this.setState({ path: event.target.value });
  };

  onSubmit = event => {
    // fetch data
    this.onFetchFromGitHub(this.state.path);
    event.preventDefault();
  };

  onFetchFromGitHub = (path, cursor) => {
    const [organization, repository] = path.split("/");

    axiosGitHubGraphQL
      .post("", {
        query: GET_ISSUES_OF_REPOSITORY,
        variables: { organization, repository, cursor }
      })
      .then(result => this.setState(resolveIssuesQuery(result, cursor)));
  };

  onFetchMoreIssues = () => {
    const { endCursor } = this.state.organization.repository.issues.pageInfo;
    this.onFetchFromGitHub(this.state.path, endCursor);
  };

  render() {
    const { path, organization, errors } = this.state;
    return (
      <div className="App">
        <header className="">
          <h1>{TITLE}</h1>
        </header>
        <div className="body">
          <form onSubmit={this.onSubmit}>
            <label htmlFor="url">
              Show open issues for https://github.com/
            </label>
            <input
              id="url"
              type="text"
              onChange={this.onChange}
              value={path}
              style={{ width: "300px" }}
            />
            <button type="submit">Search</button>
          </form>
          <hr />
          {organization ? (
            <Organization
              organization={organization}
              errors={errors}
              onFetchMoreIssues={this.onFetchMoreIssues}
            />
          ) : (
            <p>No information yet ...</p>
          )}
        </div>
      </div>
    );
  }
}

const Organization = ({ organization, errors, onFetchMoreIssues }) => {
  if (errors) {
    return (
      <p>
        <strong>Something went wrong:</strong>
        {errors.map(error => error.message).join(" ")}
      </p>
    );
  }

  return (
    <div>
      <p>
        <strong>Issues from Organization:</strong>
        <a href={organization.url}>{organization.name}</a>
      </p>
      <Repository
        repository={organization.repository}
        onFetchMoreIssues={onFetchMoreIssues}
      />
    </div>
  );
};

const Repository = ({ repository, onFetchMoreIssues }) => (
  <div>
    <p>
      <strong>In Repository:</strong>
      <a href={repository.url}>{repository.name}</a>
    </p>
    <ul>
      {repository.issues.edges.map(issue => (
        <li key={issue.node.id}>
          <a href={issue.node.url}>{issue.node.title}</a>
          <ul>
            {issue.node.reactions.edges.map(reaction => (
              <li key={reaction.node.id}>{reaction.node.content}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
    <hr />
    {repository.issues.pageInfo.hasNextPage && (
      <button onClick={onFetchMoreIssues}>More</button>
    )}
  </div>
);

const GET_ISSUES_OF_REPOSITORY = `
  query ($organization: String!, $repository: String!, $cursor : String) {
    organization(login: $organization) {
      name
      url
      repository(name: $repository) {
        name
        url
        issues(first: 5, after: $cursor, states: [OPEN]) {
          edges {
            node {
              id
              title
              url
              reactions(last: 3) {
                edges {
                  node {
                    id
                    content
                  }
                }
              }
            }
          }
          totalCount
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }
`;

export default App;
