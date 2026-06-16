import { ApiClient, ApiResponse, RequestOptions } from '../api-client';
import { Logger } from '../../utils/logger';

export interface GraphQLRequest {
  query: string;
  operationName?: string;
  variables?: Record<string, unknown>;
}

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

export class GraphQLClient {
  private client: ApiClient;
  private logger: Logger;
  private endpoint: string;

  constructor(client: ApiClient, endpoint: string, logger?: Logger) {
    this.client = client;
    this.endpoint = endpoint;
    this.logger = logger || new Logger('GraphQLClient');
  }

  async query<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    options?: Partial<RequestOptions>
  ): Promise<ApiResponse<GraphQLResponse<T>>> {
    const request: GraphQLRequest = {
      query,
      variables,
    };

    this.logger.info(`Executing GraphQL query: ${query.substring(0, 50)}...`);

    return this.client.post(this.endpoint, request, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    }) as Promise<ApiResponse<GraphQLResponse<T>>>;
  }

  async mutation<T = unknown>(
    mutation: string,
    variables?: Record<string, unknown>,
    options?: Partial<RequestOptions>
  ): Promise<ApiResponse<GraphQLResponse<T>>> {
    const request: GraphQLRequest = {
      query: mutation,
      variables,
    };

    this.logger.info(`Executing GraphQL mutation: ${mutation.substring(0, 50)}...`);

    return this.client.post(this.endpoint, request, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    }) as Promise<ApiResponse<GraphQLResponse<T>>>;
  }

  async queryWithFragment<T = unknown>(
    query: string,
    fragment: string,
    variables?: Record<string, unknown>,
    options?: Partial<RequestOptions>
  ): Promise<ApiResponse<GraphQLResponse<T>>> {
    const fullQuery = `${query}\n${fragment}`;
    return this.query(fullQuery, variables, options);
  }

  async batch<T = unknown>(
    requests: { query: string; variables?: Record<string, unknown> }[]
  ): Promise<ApiResponse<{ data: T[]; errors?: GraphQLError[] }>> {
    const operations = requests.map(req => ({
      query: req.query,
      variables: req.variables,
    }));

    return this.client.post(this.endpoint, { operations }, {
      headers: { 'Content-Type': 'application/json' },
    }) as Promise<ApiResponse<{ data: T[]; errors?: GraphQLError[] }>>;
  }

  async introspect(): Promise<ApiResponse<{ data: { __schema: unknown } }>> {
    const query = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            ...FullType
          }
          directives {
            name
            description
            locations
            args {
              ...InputValue
            }
          }
        }
      }
      fragment FullType on __Type {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          description
          args {
            ...InputValue
          }
          type {
            ...TypeRef
          }
          isDeprecated
          deprecationReason
        }
        inputFields {
          ...InputValue
        }
        interfaces {
          ...TypeRef
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
        possibleTypes {
          ...TypeRef
        }
      }
      fragment InputValue on __InputValue {
        name
        description
        type {
          ...TypeRef
        }
        defaultValue
      }
      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    return this.query(query) as Promise<ApiResponse<{ data: { __schema: unknown } }>>;
  }

  validateResponse(response: ApiResponse<GraphQLResponse>): void {
    if (response.body.errors && response.body.errors.length > 0) {
      const errorMessages = response.body.errors.map(e => e.message).join(', ');
      throw new Error(`GraphQL Errors: ${errorMessages}`);
    }
  }

  extractData<T>(response: ApiResponse<GraphQLResponse<T>>): T | undefined {
    this.validateResponse(response);
    return response.body.data;
  }
}