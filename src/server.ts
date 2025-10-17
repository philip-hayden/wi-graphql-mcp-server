import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { WiClient } from "./wiClient.js";

// Define ZodRawShape to match MCP SDK's bundled Zod version
type ZodRawShape = { [k: string]: any };

const wi = new WiClient();

// Set token from environment if available
if (process.env.WI_BEARER_TOKEN) {
  wi.setToken(process.env.WI_BEARER_TOKEN);
}

// Helper functions for wildlife management insights
function getTexasSpeciesStatus(scientificName: string): string {
  const texasGameSpecies = {
    "Odocoileus virginianus": "White-tailed Deer - Major game species",
    "Cervus canadensis": "Elk - Game species",
    "Sus scrofa": "Feral Hog - Invasive, no closed season",
    "Pecari tajacu": "Collared Peccary - Game species",
    "Ovis canadensis": "Bighorn Sheep - Game species",
    "Antilocapra americana": "Pronghorn - Game species",
    "Canis latrans": "Coyote - Predator, no closed season",
    "Vulpes vulpes": "Red Fox - Furbearer",
    "Procyon lotor": "Raccoon - Furbearer",
    "Mephitis mephitis": "Striped Skunk - Furbearer",
    "Spilogale gracilis": "Western Spotted Skunk - Furbearer",
    "Conepatus leuconotus": "Hog-nosed Skunk - Furbearer",
    "Taxidea taxus": "American Badger - Furbearer",
    "Lontra canadensis": "River Otter - Furbearer",
    "Castor canadensis": "Beaver - Furbearer",
    "Sciurus niger": "Fox Squirrel - Small game",
    "Sciurus carolinensis": "Gray Squirrel - Small game",
    "Geomys bursarius": "Plains Pocket Gopher - Non-game",
    "Cynomys ludovicianus": "Black-tailed Prairie Dog - Non-game"
  };

  return texasGameSpecies[scientificName as keyof typeof texasGameSpecies] || "Species not in Texas game classification";
}

function generateSpeciesRecommendations(species: any[], ranchGoals: string): string[] {
  const recommendations = [];

  if (species.length === 0) {
    return ["No species data available for recommendations"];
  }

  const topSpecies = species[0];
  const _totalImages = species.reduce((sum, s) => sum + s.count, 0);

  switch (ranchGoals) {
    case "hunting":
      if (topSpecies?.scientificName?.includes("Odocoileus")) {
        recommendations.push("White-tailed deer population looks good for hunting opportunities");
        recommendations.push("Monitor deer health and age structure for sustainable harvest");
      }
      if (topSpecies?.scientificName?.includes("Sus")) {
        recommendations.push("Feral hog control recommended before hunting season");
      }
      recommendations.push("Consider dove field management for bird hunting");
      break;

    case "conservation":
      recommendations.push(`Focus conservation on ${topSpecies.scientificName} as keystone species`);
      recommendations.push("Maintain habitat diversity to support all detected species");
      if (species.length < 10) {
        recommendations.push("Consider habitat restoration to increase biodiversity");
      }
      break;

    case "ecotourism":
      recommendations.push("Highlight diverse wildlife for ecotourism marketing");
      recommendations.push("Develop wildlife viewing areas based on high-activity locations");
      recommendations.push("Consider seasonal tours based on species activity patterns");
      break;

    default: // balanced
      recommendations.push("Balanced approach: maintain healthy populations of all species");
      recommendations.push("Monitor for invasive species that may impact native wildlife");
      recommendations.push("Consider sustainable harvest opportunities");
  }

  return recommendations;
}

function calculateAverageDuration(deployments: any[]): number {
  const durations = deployments
    .filter(d => d.startDatetime && d.endDatetime)
    .map(d => {
      const start = new Date(d.startDatetime).getTime();
      const end = new Date(d.endDatetime).getTime();
      return (end - start) / (1000 * 60 * 60 * 24); // days
    });

  if (durations.length === 0) return 0;
  return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
}

// GraphQL queries based on the Wildlife Insights schema
const DISCOVER_OBSERVATIONS_QUERY = `
query GetDiscoverData($filters: DiscoverObservationFilters!) {
  getDiscoverData(filters: $filters) {
    metadata {
      doctype
      version
    }
    data {
      counts {
        organizations
        initiatives
        projects
        species
        dataFiles
        devices
        deployments
        wildlifeImages
        countries
        locations
        samplingDays
        sequenceCount
        wildlifeSequenceCount
      }
      extent {
        sw {
          lng
          lat
        }
        ne {
          lng
          lat
        }
      }
      projects {
        id
        name
        slug
        shortName
        country
        photo
        organization
        location {
          lng
          lat
        }
      }
    }
  }
}`;

const GET_PROJECTS_QUERY = `
query GetProjects($pagination: Pagination, $filters: ProjectFilters) {
  getProjects(pagination: $pagination, filters: $filters) {
    data {
      id
      name
      slug
      abbreviation
      shortName
      design
      objectives
      rightsHolder
      accessRights
      projectUrl
      projectStatus
      methodology
      status
      startDate
      endDate
      embargoDate
      embargoConfirmationApproval
      remarks
      projectCreditLine
      acknowledgements
      dataCitation
      embargo
      organizationId
      organization {
        id
        name
      }
      initiativeId
      initiatives {
        id
        name
      }
      deleteDataFilesWithIdentifiedHumans
      metadataLicense
      dataFilesLicense
      metadata
      disableAnalytics
      disableCount
      publicLatitude
      publicLongitude
      publicLatitudeStr
      publicLongitudeStr
      projectType
      taggerUpload
      createdAt
      updatedAt
      catalogueImageCount
      isPrivate
      participantId
      fuzzed
      primaryCountry
      additionalCountries
      featuredDataFileId
    }
    meta {
      totalItems
      totalPages
      size
      page
    }
  }
}`;

const GET_DEPLOYMENTS_QUERY = `
query GetDeploymentsByProject($projectId: Int!, $pagination: Pagination, $filters: DeploymentFilters) {
  getDeploymentsByProject(projectId: $projectId, pagination: $pagination, filters: $filters) {
    data {
      id
      deploymentName
      startDatetime
      endDatetime
      locationId
      __typename
    }
    __typename
  }
}`;

const _GET_MY_ORGANIZATIONS_QUERY = `
query GetMyOrganizations {
  getParticipantData {
    user {
      id
      email
      firstName
      lastName
    }
    organizationRoles {
      organization {
        id
        name
        streetAddress
        city
        state
        countryCode
        email
        organizationUrl
        remarks
        projectType
        imageProjectCount
        sequenceProjectCount
        createdAt
        updatedAt
      }
      role {
        id
        name
        slug
        superAdmin
      }
    }
  }
}`;

const _GET_PROJECT_DETAILS_QUERY = `
query GetProjectDetails($projectId: Int!) {
  getProject(organizationId: 0, projectId: $projectId) {
    id
    name
    slug
    abbreviation
    shortName
    design
    objectives
    rightsHolder
    accessRights
    projectUrl
    projectStatus
    methodology
    status
    startDate
    endDate
    embargoDate
    embargoConfirmationApproval
    remarks
    projectCreditLine
    acknowledgements
    dataCitation
    embargo
    organizationId
    organization {
      id
      name
    }
    initiativeId
    initiatives {
      id
      name
    }
    deleteDataFilesWithIdentifiedHumans
    metadataLicense
    dataFilesLicense
    metadata
    disableAnalytics
    disableCount
    publicLatitude
    publicLongitude
    publicLatitudeStr
    publicLongitudeStr
    projectType
    taggerUpload
    createdAt
    updatedAt
    catalogueImageCount
    isPrivate
    participantId
    fuzzed
    primaryCountry
    additionalCountries
    featuredDataFileId
  }
}`;

const _EXPLORE_HIERARCHY_QUERY = `
query ExploreHierarchy($organizationId: Int, $projectId: Int) {
  organizations(pagination: { pageSize: 100 }, filters: { isOwnerEditorOrContributor: true }) {
    data {
      id
      name
      projectType
      imageProjectCount
      sequenceProjectCount
    }
    meta {
      totalItems
    }
  }
  projects(organizationId: $organizationId, pagination: { pageSize: 100 }) {
    data {
      id
      name
      shortName
      projectType
      status
      startDate
      endDate
      primaryCountry
      organization {
        id
        name
      }
    }
    meta {
      totalItems
    }
  }
  deployments(projectId: $projectId, pagination: { pageSize: 100 }) {
    data {
      id
      deploymentName
      startDatetime
      endDatetime
      location {
        id
        placename
        latitude
        longitude
      }
      device {
        id
        name
      }
      project {
        id
        name
      }
    }
    meta {
      totalItems
    }
  }
}`;

async function main() {
  const server = new McpServer({ name: "wi-graphql-mcp", version: "0.2.1" });

  server.registerTool(
    "auth.setToken",
    {
      description: "Set Bearer Token",
      inputSchema: { token: z.string().min(10) } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      wi.setToken(args.token);
      return { content: [{ type: "text", text: "Token set for this MCP server session." }] };
    }
  );

  server.registerTool(
    "auth.refreshToken",
    {
      title: "Refresh Token",
      description: "Stubbed example refresh flow",
      inputSchema: { refreshToken: z.string().optional() } as ZodRawShape,
    },
    async () => {
      const token = process.env.WI_BEARER_TOKEN ?? "";
      return { content: [{ type: "text", text: token ? "Token available" : "No token found" }] };
    }
  );

  server.registerTool(
    "discoverObservations",
    {
      title: "Discover Wildlife Observations",
      description: "Search for wildlife observations using filters",
      inputSchema: {
        filters: z.object({
          countries: z.array(z.string()).optional(),
          timespan: z.object({
            start: z.string(),
            end: z.string(),
          }).optional(),
          geoRegions: z.array(z.number()).optional(),
          projects: z.array(z.number()).optional(),
          initiatives: z.array(z.number()).optional(),
          endangered: z.array(z.boolean()).optional(),
          boundingBox: z.object({
            sw: z.object({
              lng: z.number(),
              lat: z.number(),
            }),
            ne: z.object({
              lng: z.number(),
              lat: z.number(),
            }),
          }).optional(),
          taxonomies: z.array(z.string()).optional(),
          continents: z.array(z.string()).optional(),
          projectNameSubstring: z.string().optional(),
          metadataLicense: z.array(z.string()).optional(),
          imageLicense: z.array(z.string()).optional(),
          embargo: z.string().optional(),
          baitUse: z.array(z.string()).optional(),
          baitType: z.array(z.string()).optional(),
          featureTypes: z.array(z.string()).optional(),
          sensorLayout: z.array(z.string()).optional(),
          sensorMethod: z.string().optional(),
          sensorCluster: z.string().optional(),
          taxonomyClass: z.array(z.string()).optional(),
          taxonomyOrder: z.array(z.string()).optional(),
          taxonomyFamily: z.array(z.string()).optional(),
          taxonomyGenus: z.array(z.string()).optional(),
          taxonomySpecies: z.array(z.string()).optional(),
          taxonomyCommonName: z.array(z.string()).optional(),
          blankImages: z.string().optional(),
        }),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { filters, bearerToken } = args;
        const variables = { filters };
        const data = await wi.exec(DISCOVER_OBSERVATIONS_QUERY, variables, "DiscoverObservations", bearerToken);
        return {
          content: [{ type: "resource", resource: { text: JSON.stringify(data, null, 2), uri: "observations.json" } }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error discovering observations: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getProjects",
    {
      title: "List Projects",
      description: "Get a list of available projects",
      inputSchema: {
        limit: z.number().default(50),
        offset: z.number().default(0),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { limit, offset, bearerToken } = args;
        const variables = {
          pagination: { limit: limit || 50, offset: offset || 0 }
        };
        const data = await wi.exec(GET_PROJECTS_QUERY, variables, "GetProjects", bearerToken);
        return {
          content: [{ type: "resource", resource: { text: JSON.stringify(data, null, 2), uri: "projects.json" } }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting projects: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getDeployments",
    {
      title: "List Project Deployments",
      description: "Get deployments for a specific project",
      inputSchema: {
        projectId: z.string(),
        limit: z.number().default(100),
        offset: z.number().default(0),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, limit, _offset, bearerToken } = args;
        const variables = {
          projectId: parseInt(projectId),
          pagination: {
            pageSize: limit || 100,
            sort: [{ column: "deploymentName", order: "ASC" }]
          },
          filters: {}
        };
        const data = await wi.exec(GET_DEPLOYMENTS_QUERY, variables, "GetDeployments", bearerToken);
        return {
          content: [{ type: "resource", resource: { text: JSON.stringify(data, null, 2), uri: "deployments.json" } }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting deployments: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "executeGraphQL",
    {
      title: "Execute Custom GraphQL Query",
      description: "Execute a custom GraphQL query or mutation",
      inputSchema: {
        query: z.string(),
        variables: z.record(z.string(), z.any()).default({}),
        operationName: z.string().optional(),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { query, variables, operationName, bearerToken } = args;
        const data = await wi.exec(query, variables || {}, operationName, bearerToken);
        return {
          content: [{ type: "resource", resource: { text: JSON.stringify(data, null, 2), uri: "graphql-result.json" } }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error executing GraphQL: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getMyOrganizations",
    {
      title: "Get My Organizations",
      description: "Get organizations I have access to based on my credentials",
      inputSchema: {
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { bearerToken } = args;
        const data = await wi.exec(`
          query GetMyOrganizations {
            getParticipantData {
              user {
                id
                email
                firstName
                lastName
              }
              organizationRoles {
                organization {
                  id
                  name
                  streetAddress
                  city
                  state
                  countryCode
                  email
                  organizationUrl
                  remarks
                  projectType
                  imageProjectCount
                  sequenceProjectCount
                  createdAt
                  updatedAt
                }
                role {
                  id
                  name
                  slug
                  superAdmin
                }
              }
            }
          }
        `, {}, "GetMyOrganizations", bearerToken);

        // Format response for better readability
        const organizations = data.getParticipantData?.organizationRoles?.map((role: any) => ({
          id: role.organization.id,
          name: role.organization.name,
          role: role.role.name,
          isOwner: role.role.slug === "ORGANIZATION_OWNER",
          projectCount: role.organization.imageProjectCount || 0,
          location: [role.organization.city, role.organization.state, role.organization.countryCode].filter(Boolean).join(", ") || "Not specified"
        })) || [];

        return {
          content: [
            { type: "text", text: `Found ${organizations.length} organization(s) you have access to:` },
            { type: "resource", resource: { text: JSON.stringify({ organizations, user: data.getParticipantData?.user }, null, 2), uri: "my-organizations.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting organizations: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getMyProjects",
    {
      title: "Get My Projects",
      description: "Get projects within an organization I have access to",
      inputSchema: {
        organizationId: z.string().optional(),
        organizationName: z.string().optional(),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { organizationId, organizationName, bearerToken } = args;

        // If no organization specified, get the first one the user has access to
        let targetOrganizationId = organizationId;
        if (!targetOrganizationId && !organizationName) {
          const orgData = await wi.exec(`
            query GetMyOrganizations {
              getParticipantData {
                organizationRoles {
                  organization {
                    id
                    name
                  }
                }
              }
            }
          `, {}, "GetMyOrganizations", bearerToken);

          const firstOrg = orgData.getParticipantData?.organizationRoles?.[0];
          if (firstOrg) {
            targetOrganizationId = firstOrg.organization.id;
          }
        }

        if (!targetOrganizationId) {
          return {
            content: [{ type: "text", text: "No organization found. Please specify organizationId or organizationName." }]
          };
        }

        const variables = {
          organizationId: parseInt(targetOrganizationId),
          pagination: { pageSize: 50, pageNumber: 1, sort: [] }
        };

        const data = await wi.exec(`
          query GetProjectsByOrganization($organizationId: Int!, $pagination: Pagination) {
            getProjects(organizationId: $organizationId, pagination: $pagination) {
              data {
                id
                name
                shortName
                projectType
                status
                startDate
                endDate
                primaryCountry
                catalogueImageCount
                organization {
                  id
                  name
                }
              }
              meta {
                totalItems
                totalPages
              }
            }
          }
        `, variables, "GetProjectsByOrganization", bearerToken);

        const projects = data.getProjects?.data || [];
        const formattedProjects = projects.map((project: any) => ({
          id: project.id,
          name: project.name,
          shortName: project.shortName,
          type: project.projectType,
          status: project.status,
          country: project.primaryCountry,
          dateRange: project.startDate && project.endDate ? `${project.startDate} to ${project.endDate}` : project.startDate || "Not specified",
          imageCount: project.catalogueImageCount || 0,
          organization: project.organization.name
        }));

        return {
          content: [
            { type: "text", text: `Found ${projects.length} project(s) in organization:` },
            { type: "resource", resource: { text: JSON.stringify({ projects: formattedProjects, metadata: data.getProjects?.meta }, null, 2), uri: "my-projects.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting projects: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "exploreMyData",
    {
      title: "Explore My Wildlife Data",
      description: "Navigate through my Wildlife Insights data hierarchy using natural language",
      inputSchema: {
        step: z.enum(["organizations", "projects", "deployments"]).optional().default("organizations"),
        organizationId: z.string().optional(),
        projectId: z.string().optional(),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { step, organizationId, projectId, bearerToken } = args;

        switch (step) {
          case "organizations":
            const orgData = await wi.exec(`
              query GetMyOrganizations {
                getParticipantData {
                  user {
                    id
                    firstName
                    lastName
                  }
                  organizationRoles {
                    organization {
                      id
                      name
                      projectType
                      imageProjectCount
                      sequenceProjectCount
                    }
                    role {
                      name
                      slug
                    }
                  }
                }
              }
            `, {}, "GetMyOrganizations", bearerToken);

            const organizations = orgData.getParticipantData?.organizationRoles?.map((role: any) => ({
              id: role.organization.id,
              name: role.organization.name,
              role: role.role.name,
              projectCount: (role.organization.imageProjectCount || 0) + (role.organization.sequenceProjectCount || 0),
              type: role.organization.projectType || "Not specified"
            })) || [];

            return {
              content: [
                { type: "text", text: `You have access to ${organizations.length} organization(s):` },
                { type: "resource", resource: { text: JSON.stringify({ organizations, user: orgData.getParticipantData?.user }, null, 2), uri: "my-organizations.json" } }
              ]
            };

          case "projects":
            if (!organizationId) {
              return {
                content: [{ type: "text", text: "Please specify organizationId to explore projects." }]
              };
            }

            const projData = await wi.exec(`
              query GetProjectsByOrganization($organizationId: Int!) {
                getProjects(organizationId: $organizationId, pagination: { pageSize: 50, pageNumber: 1, sort: [] }) {
                  data {
                    id
                    name
                    shortName
                    projectType
                    status
                    startDate
                    endDate
                    primaryCountry
                    catalogueImageCount
                  }
                  meta {
                    totalItems
                  }
                }
              }
            `, { organizationId: parseInt(organizationId) }, "GetProjectsByOrganization", bearerToken);

            const projects = projData.getProjects?.data || [];
            return {
              content: [
                { type: "text", text: `Found ${projects.length} project(s) in this organization:` },
                { type: "resource", resource: { text: JSON.stringify({ projects, metadata: projData.getProjects?.meta }, null, 2), uri: "organization-projects.json" } }
              ]
            };

          case "deployments":
            if (!projectId) {
              return {
                content: [{ type: "text", text: "Please specify projectId to explore deployments." }]
              };
            }

            const depData = await wi.exec(`
              query GetDeploymentsByProject($projectId: Int!) {
                getDeploymentsByProject(projectId: $projectId, pagination: { pageSize: 100, sort: [{ column: "deploymentName", order: "ASC" }] }, filters: {}) {
                  data {
                    id
                    deploymentName
                    startDatetime
                    endDatetime
                    location {
                      id
                      placename
                      latitude
                      longitude
                    }
                    device {
                      id
                      name
                    }
                  }
                  meta {
                    totalItems
                  }
                }
              }
            `, { projectId: parseInt(projectId) }, "GetDeploymentsByProject", bearerToken);

            const deployments = depData.getDeploymentsByProject?.data || [];
            return {
              content: [
                { type: "text", text: `Found ${deployments.length} deployment(s) in this project:` },
                { type: "resource", resource: { text: JSON.stringify({ deployments, metadata: depData.getDeploymentsByProject?.meta }, null, 2), uri: "project-deployments.json" } }
              ]
            };

          default:
            return {
              content: [{ type: "text", text: "Please specify step: 'organizations', 'projects', or 'deployments'" }]
            };
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error exploring data: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getIdentifyPhotosCount",
    {
      title: "Get Images Needing Identification",
      description: "Get count of images that need identification in a project",
      inputSchema: {
        projectId: z.string(),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, bearerToken } = args;
        const variables = { projectId: parseInt(projectId) };

        const data = await wi.exec(`
          query getIdentifyPhotosCount($projectId: Int!) {
            getCountInIdentifyForProject(projectId: $projectId) {
              meta {
                totalItems
                __typename
              }
              __typename
            }
          }
        `, variables, "getIdentifyPhotosCount", bearerToken);

        const count = data.getCountInIdentifyForProject?.meta?.totalItems || 0;
        return {
          content: [
            { type: "text", text: `Found ${count} image(s) needing identification in project ${projectId}` },
            { type: "resource", resource: { text: JSON.stringify(data, null, 2), uri: "identify-count.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting identify count: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getImagesForIdentification",
    {
      title: "Get Images for Identification",
      description: "Get images that need identification with pagination",
      inputSchema: {
        projectId: z.string(),
        limit: z.number().default(20),
        offset: z.number().default(0),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, limit, _offset, bearerToken } = args;
        const variables = {
          projectId: parseInt(projectId),
          pagination: { pageSize: limit || 20, pageNumber: 1, sort: [] }
        };

        const data = await wi.exec(`
          query getDataFilesForIdentifyForProject($projectId: Int!, $pagination: Pagination) {
            getDataFilesForIdentifyForProject(projectId: $projectId, pagination: $pagination) {
              data {
                id
                filename
                filepath
                thumbnailUrl
                timestamp
                deployment {
                  id
                  deploymentName
                  location {
                    placename
                    latitude
                    longitude
                  }
                }
                identificationOutputs {
                  id
                  blankYn
                  confidence
                  identifiedObjects {
                    taxonomy {
                      scientificName
                      commonNameEnglish
                    }
                    count
                  }
                }
              }
              meta {
                totalItems
                totalPages
                size
                page
              }
            }
          }
        `, variables, "getDataFilesForIdentifyForProject", bearerToken);

        const images = data.getDataFilesForIdentifyForProject?.data || [];
        const formattedImages = images.map((img: any) => ({
          id: img.id,
          filename: img.filename,
          thumbnailUrl: img.thumbnailUrl,
          timestamp: img.timestamp,
          deployment: img.deployment?.deploymentName || "Unknown",
          location: img.deployment?.location?.placename || "Unknown",
          coordinates: img.deployment?.location ? {
            lat: img.deployment.location.latitude,
            lng: img.deployment.location.longitude
          } : null,
          currentIdentifications: img.identificationOutputs?.map((id: any) => ({
            isBlank: id.blankYn,
            confidence: id.confidence,
            species: id.identifiedObjects?.map((obj: any) =>
              obj.taxonomy?.scientificName || obj.taxonomy?.commonNameEnglish
            ).filter(Boolean),
            count: id.identifiedObjects?.[0]?.count || 0
          })) || []
        }));

        return {
          content: [
            { type: "text", text: `Retrieved ${images.length} image(s) for identification from project ${projectId}` },
            { type: "resource", resource: { text: JSON.stringify({
              images: formattedImages,
              metadata: data.getDataFilesForIdentifyForProject?.meta
            }, null, 2), uri: "identify-images.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting images for identification: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "submitIdentification",
    {
      title: "Submit Image Identification",
      description: "Submit identification for an image",
      inputSchema: {
        projectId: z.string(),
        deploymentId: z.string(),
        dataFileId: z.string(),
        identification: z.object({
          blankYn: z.boolean(),
          identificationMethodId: z.number().default(1), // Manual identification
          identifiedObjects: z.array(z.object({
            taxonomyId: z.string(),
            count: z.number().default(1),
            certainity: z.number().optional(),
            relativeAge: z.string().optional(),
            sex: z.string().optional(),
            behavior: z.string().optional(),
            markings: z.string().optional(),
            individualIdentified: z.boolean().default(false)
          })).optional(),
          boundingBoxes: z.array(z.object({
            detectionBox: z.string()
          })).optional()
        }),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, deploymentId, dataFileId, identification, bearerToken } = args;

        const variables = {
          projectId: parseInt(projectId),
          deploymentId: parseInt(deploymentId),
          dataFileId: parseInt(dataFileId),
          identification
        };

        const data = await wi.exec(`
          mutation createIdentificationOutput($projectId: Int!, $deploymentId: Int!, $dataFileId: Int!, $identification: IdentificationOutputCreate!) {
            createIdentificationOutput(
              projectId: $projectId
              deploymentId: $deploymentId
              dataFileId: $dataFileId
              body: $identification
            ) {
              id
              blankYn
              confidence
              timestamp
              identificationMethod {
                name
              }
              identifiedObjects {
                taxonomy {
                  scientificName
                  commonNameEnglish
                }
                count
                certainity
              }
            }
          }
        `, variables, "createIdentificationOutput", bearerToken);

        return {
          content: [
            { type: "text", text: `Successfully submitted identification for image ${dataFileId}` },
            { type: "resource", resource: { text: JSON.stringify(data, null, 2), uri: "identification-result.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error submitting identification: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "bulkIdentifyImages",
    {
      title: "Bulk Identify Images",
      description: "Submit identifications for multiple images at once",
      inputSchema: {
        projectId: z.string(),
        identifications: z.array(z.object({
          deploymentId: z.string(),
          dataFileId: z.string(),
          identification: z.object({
            blankYn: z.boolean(),
            identificationMethodId: z.number().default(1),
            identifiedObjects: z.array(z.object({
              taxonomyId: z.string(),
              count: z.number().default(1)
            })).optional()
          })
        })),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, identifications, bearerToken } = args;

        const results = [];
        for (const item of identifications) {
          try {
            const variables = {
              projectId: parseInt(projectId),
              deploymentId: parseInt(item.deploymentId),
              dataFileId: parseInt(item.dataFileId),
              identification: item.identification
            };

            const data = await wi.exec(`
              mutation createIdentificationOutput($projectId: Int!, $deploymentId: Int!, $dataFileId: Int!, $identification: IdentificationOutputCreate!) {
                createIdentificationOutput(
                  projectId: $projectId
                  deploymentId: $deploymentId
                  dataFileId: $dataFileId
                  body: $identification
                ) {
                  id
                  blankYn
                  identifiedObjects {
                    taxonomy {
                      scientificName
                    }
                    count
                  }
                }
              }
            `, variables, "createIdentificationOutput", bearerToken);

            results.push({
              dataFileId: item.dataFileId,
              success: true,
              result: data.createIdentificationOutput
            });
          } catch (error) {
            results.push({
              dataFileId: item.dataFileId,
              success: false,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        return {
          content: [
            { type: "text", text: `Bulk identification completed: ${successCount} successful, ${failureCount} failed` },
            { type: "resource", resource: { text: JSON.stringify({ results, summary: { successCount, failureCount } }, null, 2), uri: "bulk-identification-results.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error in bulk identification: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getIdentificationWorkflow",
    {
      title: "Get Identification Workflow Status",
      description: "Get complete workflow status for identification process",
      inputSchema: {
        projectId: z.string(),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, bearerToken } = args;

        // Get count of images needing identification
        const countData = await wi.exec(`
          query getIdentifyPhotosCount($projectId: Int!) {
            getCountInIdentifyForProject(projectId: $projectId) {
              meta {
                totalItems
              }
            }
          }
        `, { projectId: parseInt(projectId) }, "getIdentifyPhotosCount", bearerToken);

        // Get sample images for identification
        const imagesData = await wi.exec(`
          query getDataFilesForIdentifyForProject($projectId: Int!) {
            getDataFilesForIdentifyForProject(projectId: $projectId, pagination: { pageSize: 5, pageNumber: 1, sort: [] }) {
              data {
                id
                filename
                thumbnailUrl
                deployment {
                  deploymentName
                  location {
                    placename
                  }
                }
                identificationOutputs {
                  id
                  blankYn
                  confidence
                  identifiedObjects {
                    taxonomy {
                      scientificName
                      commonNameEnglish
                    }
                    count
                  }
                }
              }
              meta {
                totalItems
              }
            }
          }
        `, { projectId: parseInt(projectId) }, "getDataFilesForIdentifyForProject", bearerToken);

        const workflowStatus = {
          projectId: projectId,
          imagesNeedingIdentification: countData.getCountInIdentifyForProject?.meta?.totalItems || 0,
          sampleImages: imagesData.getDataFilesForIdentifyForProject?.data?.map((img: any) => ({
            id: img.id,
            filename: img.filename,
            thumbnailUrl: img.thumbnailUrl,
            deployment: img.deployment?.deploymentName,
            location: img.deployment?.location?.placename,
            hasIdentifications: (img.identificationOutputs?.length || 0) > 0,
            identificationCount: img.identificationOutputs?.length || 0
          })) || [],
          totalImagesAvailable: imagesData.getDataFilesForIdentifyForProject?.meta?.totalItems || 0,
          nextSteps: [
            "Use getImagesForIdentification to get more images",
            "Use submitIdentification to identify individual images",
            "Use bulkIdentifyImages to process multiple images at once"
          ]
        };

        return {
          content: [
            { type: "text", text: `Identification Workflow Status for Project ${projectId}: ${workflowStatus.imagesNeedingIdentification} images need identification` },
            { type: "resource", resource: { text: JSON.stringify(workflowStatus, null, 2), uri: "identification-workflow.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting workflow status: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getProjectAnalytics",
    {
      title: "Get Project Analytics",
      description: "Get comprehensive analytics for wildlife management planning",
      inputSchema: {
        projectId: z.string(),
        organizationId: z.string().optional(),
        initiativeId: z.string().optional(),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, organizationId, initiativeId, bearerToken } = args;

        const variables: any = {
          projectId: parseInt(projectId)
        };

        if (organizationId) variables.organizationId = parseInt(organizationId);
        if (initiativeId) variables.initiativeId = parseInt(initiativeId);

        const data = await wi.exec(`
          query GetProjectAnalytics($projectId: Int!, $organizationId: Int, $initiativeId: Int) {
            getAnalytics(projectId: $projectId, organizationId: $organizationId, initiativeId: $initiativeId) {
              numDevices
              numDeployments
              numIdentifications
              numSpecies
              numImages
              numIdentifyImages
              numSequences
              uniqueLocations
              blankImagesCount
              blankSequencesCount
              unknownImagesCount
              unknownSequencesCount
              samplingDaysCount
              usersWithRolesOnProject
              numUsers
              wildlifeImagesCount
              wildlifeSequencesCount
              nonWildlifeImagesCount
              nonWildlifeSequencesCount
              avgNumberOfSequencesPerDeployment
              averageNumberOfImagesPerDeployment
              imagesPerSpecies {
                scientificName
                count
              }
              sequencesPerSpecies {
                scientificName
                count
              }
              imagesPerLocation {
                placename
                count
              }
              organizationCount
              initiativeCount
              projectCount
              numCountries
              firstSurveyDate
              lastSurveyDate
            }
          }
        `, variables, "GetProjectAnalytics", bearerToken);

        // Format for wildlife management insights
        const analytics = data.getAnalytics;
        const topSpecies = analytics?.imagesPerSpecies?.slice(0, 10) || [];
        const topLocations = analytics?.imagesPerLocation?.slice(0, 10) || [];

        const managementInsights = {
          projectOverview: {
            projectId: projectId,
            totalImages: analytics?.numImages || 0,
            identifiedImages: analytics?.wildlifeImagesCount || 0,
            unidentifiedImages: analytics?.numIdentifyImages || 0,
            speciesCount: analytics?.numSpecies || 0,
            samplingDays: analytics?.samplingDaysCount || 0,
            locations: analytics?.uniqueLocations || 0,
            dateRange: {
              firstSurvey: analytics?.firstSurveyDate,
              lastSurvey: analytics?.lastSurveyDate
            }
          },
          speciesAnalysis: {
            topSpecies: topSpecies.map((species: any) => ({
              name: species.scientificName,
              imageCount: species.count,
              percentage: ((species.count / (analytics?.wildlifeImagesCount || 1)) * 100).toFixed(1) + '%'
            })),
            diversity: {
              totalSpecies: analytics?.numSpecies || 0,
              assessment: analytics?.numSpecies > 10 ? "High biodiversity" :
                        analytics?.numSpecies > 5 ? "Moderate biodiversity" : "Low biodiversity"
            }
          },
          temporalPatterns: {
            samplingDays: analytics?.samplingDaysCount || 0,
            averageImagesPerDay: ((analytics?.wildlifeImagesCount || 0) / (analytics?.samplingDaysCount || 1)).toFixed(2),
            surveyConsistency: analytics?.samplingDaysCount > 300 ? "Excellent coverage" :
                              analytics?.samplingDaysCount > 180 ? "Good coverage" : "Limited coverage"
          },
          locationAnalysis: {
            uniqueLocations: analytics?.uniqueLocations || 0,
            topLocations: topLocations.map((location: any) => ({
              name: location.placename,
              imageCount: location.count,
              activityLevel: location.count > 50 ? "High activity" :
                           location.count > 20 ? "Moderate activity" : "Low activity"
            }))
          },
          managementRecommendations: [
            topSpecies.length > 0 ? `Focus management on ${topSpecies[0].scientificName} (most abundant species)` : null,
            analytics?.numIdentifyImages > 100 ? "Prioritize image identification to improve data quality" : null,
            analytics?.uniqueLocations < 3 ? "Consider expanding camera deployment to increase spatial coverage" : null,
            analytics?.samplingDaysCount < 180 ? "Extend monitoring period for more robust seasonal data" : null,
            topLocations.length > 0 && topLocations[0].count > topLocations[topLocations.length - 1]?.count * 3 ?
              "Redistribute cameras to balance coverage across locations" : null
          ].filter(Boolean)
        };

        return {
          content: [
            { type: "text", text: `Analytics for Project ${projectId}: ${analytics?.numSpecies || 0} species, ${analytics?.wildlifeImagesCount || 0} wildlife images, ${analytics?.uniqueLocations || 0} locations` },
            { type: "resource", resource: { text: JSON.stringify(managementInsights, null, 2), uri: "project-analytics.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting project analytics: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getSpeciesAnalytics",
    {
      title: "Get Species Analytics",
      description: "Get detailed species analysis for wildlife management",
      inputSchema: {
        projectId: z.string(),
        filters: z.object({
          taxonomyUUIDs: z.array(z.string()).optional(),
          subprojectIds: z.array(z.number()).optional(),
          iucnIds: z.array(z.number()).optional(),
          locationIds: z.array(z.number()).optional(),
          isSequence: z.boolean().optional(),
          deviceIds: z.array(z.number()).optional(),
          sensorHeight: z.array(z.string()).optional(),
          sensorStatus: z.array(z.string()).optional(),
          sensorOrientation: z.array(z.string()).optional(),
          baitTypeIds: z.array(z.number()).optional(),
          featureTypes: z.array(z.string()).optional(),
          timespans: z.array(z.object({
            start: z.string(),
            end: z.string()
          })).optional(),
          identifiedByExpertFlag: z.boolean().optional(),
          isAnalytics: z.boolean().optional()
        }).optional(),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, filters, bearerToken } = args;

        const variables = {
          projectId: parseInt(projectId),
          parameterKey: "species",
          filters: filters || {}
        };

        const data = await wi.exec(`
          query GetSpeciesAnalytics($projectId: Int!, $parameterKey: String!, $filters: AnalyticsFilters) {
            getAnalyticsByParameter(projectId: $projectId, parameterKey: $parameterKey, filters: $filters) {
              numDevices
              numDeployments
              numIdentifications
              numSpecies
              numImages
              numIdentifyImages
              numSequences
              uniqueLocations
              blankImagesCount
              blankSequencesCount
              unknownImagesCount
              unknownSequencesCount
              samplingDaysCount
              usersWithRolesOnProject
              numUsers
              wildlifeImagesCount
              wildlifeSequencesCount
              nonWildlifeImagesCount
              nonWildlifeSequencesCount
              avgNumberOfSequencesPerDeployment
              averageNumberOfImagesPerDeployment
              imagesPerSpecies {
                scientificName
                commonNameEnglish
                count
              }
              sequencesPerSpecies {
                scientificName
                commonNameEnglish
                count
              }
              imagesPerLocation {
                placename
                latitude
                longitude
                count
              }
              organizationCount
              initiativeCount
              projectCount
              numCountries
              firstSurveyDate
              lastSurveyDate
            }
          }
        `, variables, "GetSpeciesAnalytics", bearerToken);

        const analytics = data.getAnalyticsByParameter;
        const speciesData = analytics?.imagesPerSpecies || [];

        // Analyze species patterns for management insights
        const speciesAnalysis = {
          speciesSummary: {
            totalSpecies: analytics?.numSpecies || 0,
            totalImages: analytics?.wildlifeImagesCount || 0,
            averageImagesPerSpecies: ((analytics?.wildlifeImagesCount || 0) / (analytics?.numSpecies || 1)).toFixed(1)
          },
          dominantSpecies: speciesData.slice(0, 5).map((species: any, index: number) => ({
            rank: index + 1,
            scientificName: species.scientificName,
            commonName: species.commonNameEnglish,
            imageCount: species.count,
            percentage: ((species.count / (analytics?.wildlifeImagesCount || 1)) * 100).toFixed(1) + '%',
            managementPriority: index === 0 ? "Highest" : index < 3 ? "High" : "Medium"
          })),
          rareSpecies: speciesData.slice(-3).map((species: any) => ({
            scientificName: species.scientificName,
            commonName: species.commonNameEnglish,
            imageCount: species.count,
            conservationConcern: species.count < 5 ? "Monitor closely" : "Continue monitoring"
          })),
          managementImplications: [
            speciesData.length > 10 ? "High biodiversity - consider habitat preservation" : "Lower biodiversity - may need habitat enhancement",
            speciesData[0]?.count > (analytics?.wildlifeImagesCount || 0) * 0.5 ? "Dominant species may indicate ecosystem imbalance" : "Balanced species distribution",
            (analytics?.unknownImagesCount || 0) > (analytics?.wildlifeImagesCount || 0) * 0.2 ? "High unknown rate - improve identification process" : "Good identification rate"
          ]
        };

        return {
          content: [
            { type: "text", text: `Species Analysis for Project ${projectId}: ${speciesData.length} species identified from ${analytics?.wildlifeImagesCount || 0} wildlife images` },
            { type: "resource", resource: { text: JSON.stringify(speciesAnalysis, null, 2), uri: "species-analytics.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting species analytics: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getRanchManagementInsights",
    {
      title: "Get Ranch Management Insights",
      description: "Generate wildlife management recommendations for your Texas ranch",
      inputSchema: {
        projectId: z.string(),
        ranchGoals: z.enum(["conservation", "hunting", "ecotourism", "balanced"]).optional().default("balanced"),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, ranchGoals, bearerToken } = args;

        // Get comprehensive analytics data
        const analyticsData = await wi.exec(`
          query GetRanchAnalytics($projectId: Int!) {
            getAnalytics(projectId: $projectId) {
              numSpecies
              numImages
              wildlifeImagesCount
              numIdentifyImages
              samplingDaysCount
              uniqueLocations
              firstSurveyDate
              lastSurveyDate
              imagesPerSpecies {
                scientificName
                commonNameEnglish
                count
              }
              imagesPerLocation {
                placename
                latitude
                longitude
                count
              }
            }
          }
        `, { projectId: parseInt(projectId) }, "GetRanchAnalytics", bearerToken);

        const analytics = analyticsData.getAnalytics;
        const species = analytics?.imagesPerSpecies || [];
        const locations = analytics?.imagesPerLocation || [];

        // Generate Texas-specific management insights
        const insights = {
          currentStatus: {
            projectId: projectId,
            monitoringDays: analytics?.samplingDaysCount || 0,
            locationsMonitored: analytics?.uniqueLocations || 0,
            speciesDetected: analytics?.numSpecies || 0,
            totalImages: analytics?.numImages || 0,
            identificationProgress: {
              identified: analytics?.wildlifeImagesCount || 0,
              pending: analytics?.numIdentifyImages || 0,
              completionRate: (((analytics?.wildlifeImagesCount || 0) / (analytics?.numImages || 1)) * 100).toFixed(1) + '%'
            }
          },
          speciesManagement: {
            keySpecies: species.slice(0, 5).map((s: any) => ({
              name: s.scientificName,
              commonName: s.commonNameEnglish,
              population: s.count,
              trend: s.count > 50 ? "Abundant" : s.count > 20 ? "Common" : "Present",
              texasStatus: getTexasSpeciesStatus(s.scientificName)
            })),
            managementActions: generateSpeciesRecommendations(species, ranchGoals)
          },
          habitatManagement: {
            locationEffectiveness: locations.map((loc: any) => ({
              name: loc.placename,
              activity: loc.count,
              coordinates: { lat: loc.latitude, lng: loc.longitude },
              recommendation: loc.count > 100 ? "High-value habitat - maintain" :
                             loc.count > 50 ? "Good habitat - consider enhancement" : "Low activity - evaluate placement"
            })),
            coverageAssessment: {
              currentLocations: analytics?.uniqueLocations || 0,
              recommendedLocations: Math.max(3, (analytics?.uniqueLocations || 0) * 2),
              coverageQuality: analytics?.uniqueLocations > 3 ? "Good" : "Needs improvement"
            }
          },
          seasonalPatterns: {
            monitoringPeriod: {
              start: analytics?.firstSurveyDate,
              end: analytics?.lastSurveyDate,
              duration: analytics?.samplingDaysCount || 0
            },
            recommendations: [
              analytics?.samplingDaysCount < 180 ? "Extend monitoring to capture full seasonal cycles" : "Good seasonal coverage",
              "Consider winter monitoring for deer movement patterns",
              "Spring monitoring important for fawn recruitment",
              "Summer monitoring for heat stress impacts"
            ]
          },
          texasRanchRecommendations: {
            whiteTailedDeer: species.find((s: any) => s.scientificName?.includes("Odocoileus")) ? {
              population: species.find((s: any) => s.scientificName?.includes("Odocoileus"))?.count || 0,
              management: "Monitor for CWD, maintain habitat quality, consider supplemental feeding during drought"
            } : null,
            feralHogs: species.find((s: any) => s.scientificName?.includes("Sus")) ? {
              population: species.find((s: any) => s.scientificName?.includes("Sus"))?.count || 0,
              management: "Control population, protect water sources, monitor for disease transmission"
            } : null,
            biodiversity: {
              currentLevel: analytics?.numSpecies || 0,
              targetLevel: 15,
              action: analytics?.numSpecies < 10 ? "Enhance habitat diversity" : "Maintain current diversity"
            }
          }
        };

        return {
          content: [
            { type: "text", text: `Ranch Management Insights for Project ${projectId}: ${analytics?.numSpecies || 0} species across ${analytics?.uniqueLocations || 0} locations` },
            { type: "resource", resource: { text: JSON.stringify(insights, null, 2), uri: "ranch-management-insights.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting ranch management insights: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getDeploymentAnalytics",
    {
      title: "Get Deployment Analytics",
      description: "Analyze camera deployment effectiveness for optimal placement",
      inputSchema: {
        projectId: z.string(),
        filters: z.object({
          locationIds: z.array(z.number()).optional(),
          name: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          timespans: z.array(z.object({
            start: z.string(),
            end: z.string()
          })).optional(),
          subprojectIds: z.array(z.number()).optional(),
          taxonomyUUIDs: z.array(z.string()).optional(),
          identifiedByExpertFlag: z.boolean().optional(),
          isSequence: z.boolean().optional(),
          iucnIds: z.array(z.number()).optional(),
          deviceIds: z.array(z.number()).optional(),
          sensorHeight: z.array(z.string()).optional(),
          sensorStatus: z.array(z.string()).optional(),
          sensorOrientation: z.array(z.string()).optional(),
          baitTypeIds: z.array(z.number()).optional(),
          featureTypes: z.array(z.string()).optional(),
          deploymentIds: z.array(z.number()).optional(),
          rotation_angle: z.number().optional(),
          isAnalytics: z.boolean().optional(),
          taggerIds: z.array(z.number()).optional(),
          dateSpans: z.array(z.object({
            start: z.string(),
            end: z.string()
          })).optional(),
          dataFileTimeSpans: z.array(z.object({
            start: z.string(),
            end: z.string()
          })).optional(),
          confidenceRange: z.array(z.object({
            start: z.number(),
            end: z.number()
          })).optional(),
          includeLocationName: z.boolean().optional()
        }).optional(),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, filters, bearerToken } = args;

        const variables = {
          projectId: parseInt(projectId),
          filters: filters || {}
        };

        const data = await wi.exec(`
          query GetDeploymentAnalytics($projectId: Int!, $filters: DeploymentFilters) {
            getDeploymentsByProject(projectId: $projectId, filters: $filters, pagination: { pageSize: 100 }) {
              data {
                id
                deploymentName
                startDatetime
                endDatetime
                location {
                  id
                  placename
                  latitude
                  longitude
                }
                device {
                  id
                  name
                }
                baitType {
                  id
                  typeName
                }
                sensorHeight
                sensorOrientation
                remarks
              }
              meta {
                totalItems
              }
            }
          }
        `, variables, "GetDeploymentAnalytics", bearerToken);

        const deployments = data.getDeploymentsByProject?.data || [];

        // Analyze deployment effectiveness
        const deploymentAnalysis = {
          deploymentSummary: {
            totalDeployments: deployments.length,
            activeDeployments: deployments.filter((d: any) => !d.endDatetime).length,
            averageDuration: calculateAverageDuration(deployments),
            uniqueLocations: new Set(deployments.map((d: any) => d.location?.id)).size
          },
          locationEffectiveness: deployments.map((deployment: any) => ({
            name: deployment.deploymentName,
            location: deployment.location?.placename || "Unknown",
            coordinates: deployment.location ? {
              lat: deployment.location.latitude,
              lng: deployment.location.longitude
            } : null,
            duration: deployment.startDatetime && deployment.endDatetime ?
              Math.ceil((new Date(deployment.endDatetime).getTime() - new Date(deployment.startDatetime).getTime()) / (1000 * 60 * 60 * 24)) : null,
            setup: {
              cameraHeight: deployment.sensorHeight,
              orientation: deployment.sensorOrientation,
              baitType: deployment.baitType?.typeName
            },
            effectiveness: "Needs image count data" // Would need additional query
          })),
          optimizationRecommendations: [
            deployments.length < 3 ? "Increase number of camera deployments for better coverage" : "Good deployment density",
            "Consider seasonal bait strategies for target species",
            "Monitor camera heights - optimal range typically 3-4 feet for deer",
            "Evaluate camera angles for maximum detection coverage"
          ]
        };

        return {
          content: [
            { type: "text", text: `Deployment Analysis for Project ${projectId}: ${deployments.length} deployments across ${deploymentAnalysis.deploymentSummary.uniqueLocations} locations` },
            { type: "resource", resource: { text: JSON.stringify(deploymentAnalysis, null, 2), uri: "deployment-analytics.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting deployment analytics: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "createUpload",
    {
      title: "Create Image Upload Session",
      description: "Create a new upload session for camera trap images",
      inputSchema: {
        projectId: z.string(),
        deploymentId: z.string(),
        noOfImages: z.number().default(1),
        noOfDuplicateImages: z.number().default(0),
        duplicateFlagOnUpload: z.boolean().default(true),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, deploymentId, noOfImages, noOfDuplicateImages, duplicateFlagOnUpload, bearerToken } = args;

        const variables = {
          uiUploadCreateRequest: {
            projectId: parseInt(projectId),
            deploymentId: parseInt(deploymentId),
            noOfImages: noOfImages || 1,
            noOfDuplicateImages: noOfDuplicateImages || 0,
            duplicateFlagOnUpload: duplicateFlagOnUpload !== false
          }
        };

        const data = await wi.exec(`
          mutation createUIUpload($uiUploadCreateRequest: UIUploadCreateRequest!) {
            createUIUpload(uiUploadCreateRequest: $uiUploadCreateRequest) {
              id
              projectId
              deploymentId
              noOfImages
              status
              createdAt
            }
          }
        `, variables, "createUIUpload", bearerToken);

        return {
          content: [
            { type: "text", text: `Upload session created successfully! Upload ID: ${data.createUIUpload?.id}` },
            { type: "resource", resource: { text: JSON.stringify(data, null, 2), uri: "upload-session.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error creating upload session: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "getUploadUrl",
    {
      title: "Get File Upload URL",
      description: "Get signed URL for uploading camera trap images",
      inputSchema: {
        projectId: z.string(),
        deploymentId: z.string(),
        uploadId: z.string(),
        fileName: z.string(),
        fileSize: z.string(),
        contentType: z.string().default("image/jpeg"),
        clientId: z.string().optional(),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, deploymentId, uploadId, fileName, fileSize, contentType, clientId, bearerToken } = args;

        const variables = {
          projectId: parseInt(projectId),
          deploymentId: parseInt(deploymentId),
          uploadId: parseInt(uploadId),
          fileName: fileName,
          fileSize: fileSize,
          contentType: contentType || "image/jpeg",
          clientId: clientId || `mcp-${Date.now()}`
        };

        const data = await wi.exec(`
          query getUploadUrlByFilenameAndSize(
            $projectId: Int!
            $deploymentId: Int!
            $uploadId: Int!
            $fileName: String!
            $fileSize: String!
            $contentType: String!
            $clientId: String
          ) {
            getUploadUrlByFilenameAndSize(
              projectId: $projectId
              deploymentId: $deploymentId
              uploadId: $uploadId
              fileName: $fileName
              fileSize: $fileSize
              contentType: $contentType
              clientId: $clientId
            ) {
              id
              mainUrl
              url
              downloadUrl
            }
          }
        `, variables, "getUploadUrlByFilenameAndSize", bearerToken);

        if (!data.getUploadUrlByFilenameAndSize) {
          return {
            content: [{ type: "text", text: "Failed to get upload URL. Make sure the upload session exists." }]
          };
        }

        return {
          content: [
            { type: "text", text: `Upload URL generated for ${fileName} (${fileSize} bytes)` },
            { type: "resource", resource: { text: JSON.stringify(data, null, 2), uri: "upload-url.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting upload URL: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "completeUpload",
    {
      title: "Complete Upload Session",
      description: "Mark an upload session as finished",
      inputSchema: {
        uploadId: z.string(),
        status: z.enum(["UPLOAD_FINISHED", "PROCESSING", "FINISHED"]).default("UPLOAD_FINISHED"),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { uploadId, status, bearerToken } = args;

        const variables = {
          uploadId: parseInt(uploadId),
          updateUIUplaodRequest: {
            status: status || "UPLOAD_FINISHED"
          }
        };

        const data = await wi.exec(`
          mutation updateUIUpload($uploadId: Int!, $updateUIUplaodRequest: UIUploadUpdateRequest!) {
            updateUIUpload(uploadId: $uploadId, updateUIUplaodRequest: $updateUIUplaodRequest) {
              id
              deploymentId
              status
              finishedAt
              noOfImages
              noOfSuccessfulImages
              noOfFailedImages
            }
          }
        `, variables, "updateUIUpload", bearerToken);

        return {
          content: [
            { type: "text", text: `Upload session ${uploadId} marked as ${status || "UPLOAD_FINISHED"}` },
            { type: "resource", resource: { text: JSON.stringify(data, null, 2), uri: "upload-completion.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error completing upload: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "validateDeploymentForUpload",
    {
      title: "Validate Deployment for Upload",
      description: "Check if a deployment is properly configured for image uploads",
      inputSchema: {
        projectId: z.string(),
        deploymentId: z.string().optional(),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, deploymentId, bearerToken } = args;

        if (!deploymentId) {
          // Get all deployments for the project
          const deploymentsData = await wi.exec(`
            query getDeploymentsByProject($projectId: Int!) {
              getDeploymentsByProject(projectId: $projectId, pagination: { pageSize: 100 }) {
                data {
                  id
                  deploymentName
                  startDatetime
                  endDatetime
                  locationId
                  location {
                    id
                    placename
                  }
                }
              }
            }
          `, { projectId: parseInt(projectId) }, "getDeploymentsByProject", bearerToken);

          const deployments = deploymentsData.getDeploymentsByProject?.data || [];
          const validDeployments = deployments.filter((d: any) => d.startDatetime && d.endDatetime && d.locationId);

          return {
            content: [
              { type: "text", text: `Found ${deployments.length} deployment(s). ${validDeployments.length} ready for uploads.` },
              { type: "resource", resource: {
                text: JSON.stringify({
                  allDeployments: deployments,
                  validDeployments: validDeployments,
                  invalidDeployments: deployments.filter((d: any) => !d.startDatetime || !d.endDatetime || !d.locationId)
                }, null, 2),
                uri: "deployment-validation.json"
              }}
            ]
          };
        }

        // Check specific deployment
        const deploymentData = await wi.exec(`
          query getDeployment($deploymentId: Int!) {
            getDeployment(deploymentId: $deploymentId) {
              id
              deploymentName
              startDatetime
              endDatetime
              locationId
              location {
                id
                placename
                latitude
                longitude
              }
            }
          }
        `, { deploymentId: parseInt(deploymentId) }, "getDeployment", bearerToken);

        const deployment = deploymentData.getDeployment;
        const issues = [];

        if (!deployment.startDatetime) issues.push("Missing start date");
        if (!deployment.endDatetime) issues.push("Missing end date");
        if (!deployment.locationId) issues.push("Missing location");

        const isValid = issues.length === 0;

        return {
          content: [
            { type: "text", text: `Deployment "${deployment.deploymentName}" is ${isValid ? 'VALID' : 'INVALID'} for uploads. ${issues.length > 0 ? `Issues: ${issues.join(', ')}` : 'Ready for uploads!'}` },
            { type: "resource", resource: {
              text: JSON.stringify({
                deployment: deployment,
                isValidForUpload: isValid,
                issues: issues,
                nextSteps: isValid ? ["Use uploadImageWorkflow tool"] : ["Configure deployment in Wildlife Insights web interface", "Set start/end dates", "Add location information"]
              }, null, 2),
              uri: "deployment-status.json"
            }}
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error validating deployment: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "validateFileForUpload",
    {
      title: "Validate File for Upload",
      description: "Check if a file can be uploaded by validating against existing files",
      inputSchema: {
        projectId: z.string(),
        deploymentId: z.string(),
        fileName: z.string(),
        fileSize: z.string(),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, deploymentId, fileName, fileSize, bearerToken } = args;

        // Format filename with size like browser does: "filename.jpg||12345"
        const formattedFileName = `${fileName}||${fileSize}`;

        const variables = {
          projectId: parseInt(projectId),
          deploymentId: parseInt(deploymentId),
          fileNameList: [formattedFileName]
        };

        const data = await wi.exec(`
          query getDataFilesByFileNameAndSize($projectId: Int!, $deploymentId: Int!, $fileNameList: [String]!) {
            getDataFilesByFileNameAndSize(
              projectId: $projectId,
              deploymentId: $deploymentId,
              fileNameList: $fileNameList
            ) {
              exists
            }
          }
        `, variables, "getDataFilesByFileNameAndSize", bearerToken);

        const fileExists = data.getDataFilesByFileNameAndSize?.exists?.[0] || false;

        return {
          content: [
            { type: "text", text: `File validation for ${fileName}: ${fileExists ? 'EXISTS' : 'NEW FILE'}` },
            { type: "resource", resource: {
              text: JSON.stringify({
                fileName: fileName,
                fileSize: fileSize,
                formattedFileName: formattedFileName,
                exists: fileExists,
                canUpload: !fileExists,
                nextSteps: fileExists ?
                  ["File already exists - consider renaming or check if re-upload is needed"] :
                  ["File is new and can be uploaded", "Use uploadImageWorkflow to proceed with upload"]
              }, null, 2),
              uri: "file-validation.json"
            }}
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error validating file: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "uploadImageFile",
    {
      title: "Upload Image File to Wildlife Insights",
      description: "Upload a local image file directly to Wildlife Insights (handles the complete workflow)",
      inputSchema: {
        projectId: z.string(),
        deploymentId: z.string(),
        localFilePath: z.string(),
        contentType: z.string().default("image/jpeg"),
        validateFile: z.boolean().default(true),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (args: { [key: string]: any }) => {
      try {
        const { projectId, deploymentId, localFilePath, contentType, validateFile, bearerToken } = args;

        // Step 1: Get file info
        const fs = await import('fs');
        const path = await import('path');

        if (!fs.existsSync(localFilePath)) {
          return {
            content: [{ type: "text", text: `❌ File not found: ${localFilePath}` }]
          };
        }

        const fileStats = fs.statSync(localFilePath);
        const fileSize = fileStats.size.toString();
        const fileName = path.basename(localFilePath);

  console.debug(`[Upload] Processing file: ${fileName} (${fileSize} bytes)`);

        // Step 2: Validate file if requested
        if (validateFile) {
          const formattedFileName = `${fileName}||${fileSize}`;
          const validationData = await wi.exec(`
            query getDataFilesByFileNameAndSize($projectId: Int!, $deploymentId: Int!, $fileNameList: [String]!) {
              getDataFilesByFileNameAndSize(
                projectId: $projectId,
                deploymentId: $deploymentId,
                fileNameList: $fileNameList
              ) {
                exists
              }
            }
          `, {
            projectId: parseInt(projectId),
            deploymentId: parseInt(deploymentId),
            fileNameList: [formattedFileName]
          }, "getDataFilesByFileNameAndSize", bearerToken);

          const fileExists = validationData.getDataFilesByFileNameAndSize?.exists?.[0] || false;
          if (fileExists) {
            return {
              content: [
                { type: "text", text: `❌ File "${fileName}" already exists in this project/deployment.` },
                { type: "text", text: `💡 File path: ${localFilePath}` }
              ]
            };
          }
        }

        // Step 3: Create upload session
        const sessionVariables = {
          uIUploadCreateRequest: {
            projectId: parseInt(projectId),
            deploymentId: parseInt(deploymentId),
            noOfImages: 1,
            noOfDuplicateImages: 0,
            duplicateFlagOnUpload: true
          }
        };

        const sessionData = await wi.exec(`
          mutation createUIUpload($uIUploadCreateRequest: UIUploadCreateRequest!) {
            createUIUpload(uIUploadCreateRequest: $uIUploadCreateRequest) {
              id
              projectId
              deploymentId
              status
            }
          }
        `, sessionVariables, "createUIUpload", bearerToken);

        const uploadId = sessionData.createUIUpload?.id;
        if (!uploadId) {
          return {
            content: [{ type: "text", text: "❌ Failed to create upload session." }]
          };
        }

        // Step 4: Get upload URL
        const urlVariables = {
          projectId: parseInt(projectId),
          deploymentId: parseInt(deploymentId),
          uploadId: uploadId,
          fileName: fileName,
          fileSize: fileSize,
          contentType: contentType || "image/jpeg",
          clientId: `mcp-${Date.now()}`
        };

        const urlData = await wi.exec(`
          query getUploadUrlByFilenameAndSize(
            $projectId: Int!
            $deploymentId: Int!
            $uploadId: Int!
            $fileName: String!
            $fileSize: String!
            $contentType: String!
            $clientId: String
          ) {
            getUploadUrlByFilenameAndSize(
              projectId: $projectId
              deploymentId: $deploymentId
              uploadId: $uploadId
              fileName: $fileName
              fileSize: $fileSize
              contentType: $contentType
              clientId: $clientId
            ) {
              id
              mainUrl
            }
          }
        `, urlVariables, "getUploadUrlByFilenameAndSize", bearerToken);

        const uploadInfo = urlData.getUploadUrlByFilenameAndSize;
        if (!uploadInfo) {
          return {
            content: [{ type: "text", text: "❌ Failed to get upload URL." }]
          };
        }

        // Step 5: Upload file to Google Cloud Storage (Media Upload pattern)
  console.debug(`[Upload] Uploading file to Google Cloud Storage using media upload...`);
  console.debug(`[Upload] Upload URL: ${uploadInfo.mainUrl}`);
  console.debug(`[Upload] File size: ${fileSize} bytes`);
  console.debug(`[Upload] Content type: ${contentType || 'image/jpeg'}`);

        const fileBuffer = fs.readFileSync(localFilePath);
        const uploadResponse = await fetch(uploadInfo.mainUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType || 'image/jpeg',
            'Content-Length': fileSize,
          },
          body: fileBuffer,
        });

  console.debug(`[Upload] Response status: ${uploadResponse.status}`);
  console.debug(`[Upload] Response headers:`, Object.fromEntries(uploadResponse.headers.entries()));

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error(`[Upload] Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
          console.error(`[Upload] Error response: ${errorText}`);
          throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorText}`);
        }

  console.info(`[Upload] File uploaded successfully to Google Cloud Storage (${uploadResponse.status})`);

        // Step 6: Complete the upload session
        const completeVariables = {
          uploadId: uploadId,
          updateUIUplaodRequest: {
            status: "UPLOAD_FINISHED"
          }
        };

        const completeData = await wi.exec(`
          mutation updateUIUpload($uploadId: Int!, $updateUIUplaodRequest: UIUploadUpdateRequest!) {
            updateUIUpload(uploadId: $uploadId, updateUIUplaodRequest: $updateUIUplaodRequest) {
              id
              deploymentId
              status
              finishedAt
              noOfImages
              noOfSuccessfulImages
              noOfFailedImages
            }
          }
        `, completeVariables, "updateUIUpload", bearerToken);

        const result = {
          uploadSession: {
            id: uploadId,
            projectId: projectId,
            deploymentId: deploymentId,
            status: "UPLOAD_COMPLETED"
          },
          fileInfo: {
            fileName: fileName,
            fileSize: fileSize,
            localFilePath: localFilePath,
            contentType: contentType || "image/jpeg"
          },
          uploadDetails: {
            uploadUrl: uploadInfo.mainUrl,
            uploadResponse: uploadResponse.status,
            sessionCompletion: completeData.updateUIUpload
          },
          nextSteps: [
            "File has been uploaded and session completed",
            "Monitor processing status in Wildlife Insights interface",
            "Check upload report for processing results",
            "File should appear in identification workflow once processed"
          ],
          troubleshooting: {
            "If file doesn't appear": "Wait a few minutes for processing, then check upload report",
            "If processing fails": "Use 'Retry unprocessed images' in Wildlife Insights interface",
            "If session shows errors": "Check the upload report URL for detailed error information"
          }
        };

        return {
          content: [
            { type: "text", text: `🎉 File "${fileName}" uploaded successfully! Session ${uploadId} completed.` },
            { type: "resource", resource: { text: JSON.stringify(result, null, 2), uri: "upload-result.json" } }
          ]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `❌ Error uploading file: ${error}` }]
        };
      }
    }
  );

  server.registerTool(
    "uploadImageWorkflow",
    {
      title: "Complete Image Upload Workflow",
      description: "Browser-compatible workflow for uploading camera trap images (DEPRECATED - use uploadImageFile instead)",
      inputSchema: {
        projectId: z.string(),
        deploymentId: z.string(),
        fileName: z.string(),
        fileSize: z.string(),
        contentType: z.string().default("image/jpeg"),
        validateFile: z.boolean().default(true),
        skipDeploymentValidation: z.boolean().default(false),
        bearerToken: z.string().optional(),
      } as ZodRawShape,
    },
    async (_args: { [key: string]: any }) => {
      return {
        content: [
          { type: "text", text: `💡 This tool has been replaced by 'uploadImageFile' which handles the complete upload process automatically.` },
          { type: "text", text: `🔧 Use 'uploadImageFile' instead - it uploads the file directly without requiring manual curl commands.` }
        ]
      };
    }
  );

  server.registerTool(
    "whoami",
    {
      title: "Server Information",
      description: "Return basic info about this server",
      inputSchema: {},
    },
    async () => ({
      content: [
        { type: "text", text: "wi-graphql-mcp v0.2.1" },
        { type: "text", text: `endpoint=${process.env.WI_GRAPHQL_ENDPOINT}` },
        { type: "text", text: `schema=Wildlife Insights GraphQL API` },
      ],
    })
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
