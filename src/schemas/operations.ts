export const GET_DEPLOYMENTS_BY_PROJECT = /* GraphQL */ `
  query getDeploymentsByProject($projectId: Int!, $filters: DeploymentFilters) {
    getDeploymentsByProject(
      projectId: $projectId,
      pagination: { pageSize: 500, sort: [{ column: "deploymentName", order: "ASC" }] },
      filters: $filters
    ) {
      data { id deploymentName startDatetime endDatetime locationId __typename }
      __typename
    }
  }
`;
