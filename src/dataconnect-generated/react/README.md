# Generated React README
This README will guide you through the process of using the generated React SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `JavaScript README`, you can find it at [`dataconnect-generated/README.md`](../README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

You can use this generated SDK by importing from the package `@dataconnect/generated/react` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#react).

# Table of Contents
- [**Overview**](#generated-react-readme)
- [**TanStack Query Firebase & TanStack React Query**](#tanstack-query-firebase-tanstack-react-query)
  - [*Package Installation*](#installing-tanstack-query-firebase-and-tanstack-react-query-packages)
  - [*Configuring TanStack Query*](#configuring-tanstack-query)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListProjects*](#listprojects)
  - [*GetProject*](#getproject)
  - [*ListPeople*](#listpeople)
  - [*ListRoles*](#listroles)
  - [*ListRateCards*](#listratecards)
  - [*ListTimeEntries*](#listtimeentries)
  - [*ListTimeEntriesByProject*](#listtimeentriesbyproject)
  - [*ListProjectPhases*](#listprojectphases)
  - [*ListAllocations*](#listallocations)
  - [*ListDataImports*](#listdataimports)
  - [*GetAppUserByEmail*](#getappuserbyemail)
  - [*ListAppUsers*](#listappusers)
- [**Mutations**](#mutations)
  - [*InsertAllocations*](#insertallocations)
  - [*InsertBillabilityRuleConditions*](#insertbillabilityruleconditions)
  - [*InsertBillabilityRules*](#insertbillabilityrules)
  - [*InsertClientTeamAllocations*](#insertclientteamallocations)
  - [*InsertDailyAllocations*](#insertdailyallocations)
  - [*InsertDataImports*](#insertdataimports)
  - [*InsertPeople*](#insertpeople)
  - [*InsertPhaseAllocations*](#insertphaseallocations)
  - [*InsertProjectMonthlyRevenue*](#insertprojectmonthlyrevenue)
  - [*InsertProjectPhases*](#insertprojectphases)
  - [*InsertProjectScopes*](#insertprojectscopes)
  - [*InsertProjects*](#insertprojects)
  - [*InsertRateCards*](#insertratecards)
  - [*InsertRoles*](#insertroles)
  - [*InsertTimeEntries*](#inserttimeentries)
  - [*CreateAppUser*](#createappuser)
  - [*UpdateAppUser*](#updateappuser)
  - [*DeleteAppUser*](#deleteappuser)

# TanStack Query Firebase & TanStack React Query
This SDK provides [React](https://react.dev/) hooks generated specific to your application, for the operations found in the connector `example`. These hooks are generated using [TanStack Query Firebase](https://react-query-firebase.invertase.dev/) by our partners at Invertase, a library built on top of [TanStack React Query v5](https://tanstack.com/query/v5/docs/framework/react/overview).

***You do not need to be familiar with Tanstack Query or Tanstack Query Firebase to use this SDK.*** However, you may find it useful to learn more about them, as they will empower you as a user of this Generated React SDK.

## Installing TanStack Query Firebase and TanStack React Query Packages
In order to use the React generated SDK, you must install the `TanStack React Query` and `TanStack Query Firebase` packages.
```bash
npm i --save @tanstack/react-query @tanstack-query-firebase/react
```
```bash
npm i --save firebase@latest # Note: React has a peer dependency on ^11.3.0
```

You can also follow the installation instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#tanstack-install), or the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react) and [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/installation).

## Configuring TanStack Query
In order to use the React generated SDK in your application, you must wrap your application's component tree in a `QueryClientProvider` component from TanStack React Query. None of your generated React SDK hooks will work without this provider.

```javascript
import { QueryClientProvider } from '@tanstack/react-query';

// Create a TanStack Query client instance
const queryClient = new QueryClient()

function App() {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <MyApplication />
    </QueryClientProvider>
  )
}
```

To learn more about `QueryClientProvider`, see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/quick-start) and the [TanStack Query Firebase documentation](https://invertase.docs.page/tanstack-query-firebase/react#usage).

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`.

You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#emulator-react-angular).

```javascript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) using the hooks provided from your generated React SDK.

# Queries

The React generated SDK provides Query hook functions that call and return [`useDataConnectQuery`](https://react-query-firebase.invertase.dev/react/data-connect/querying) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and the most recent data returned by the Query, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/querying).

TanStack React Query caches the results of your Queries, so using the same Query hook function in multiple places in your application allows the entire application to automatically see updates to that Query's data.

Query hooks execute their Queries automatically when called, and periodically refresh, unless you change the `queryOptions` for the Query. To learn how to stop a Query from automatically executing, including how to make a query "lazy", see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries).

To learn more about TanStack React Query's Queries, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/queries).

## Using Query Hooks
Here's a general overview of how to use the generated Query hooks in your code:

- If the Query has no variables, the Query hook function does not require arguments.
- If the Query has any required variables, the Query hook function will require at least one argument: an object that contains all the required variables for the Query.
- If the Query has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Query's variables are optional, the Query hook function does not require any arguments.
- Query hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Query hooks functions can be called with or without passing in an `options` argument of type `useDataConnectQueryOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/query-options).
  - ***Special case:***  If the Query has all optional variables and you would like to provide an `options` argument to the Query hook function without providing any variables, you must pass `undefined` where you would normally pass the Query's variables, and then may provide the `options` argument.

Below are examples of how to use the `example` connector's generated Query hook functions to execute each Query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## ListProjects
You can execute the `ListProjects` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListProjects(dc: DataConnect, options?: useDataConnectQueryOptions<ListProjectsData>): UseDataConnectQueryResult<ListProjectsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListProjects(options?: useDataConnectQueryOptions<ListProjectsData>): UseDataConnectQueryResult<ListProjectsData, undefined>;
```

### Variables
The `ListProjects` Query has no variables.
### Return Type
Recall that calling the `ListProjects` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListProjects` Query is of type `ListProjectsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListProjectsData {
  projectss: ({
    id: UUIDString;
    title: string;
    opportunity_number?: string | null;
    sf_account?: string | null;
    parent_account?: string | null;
    ultimate_parent?: string | null;
    office?: string | null;
    start_date: DateString;
    end_date: DateString;
    rate_card_id?: UUIDString | null;
    rate_card_discount: number;
    fee_calc_currency?: string | null;
    fx_rate_gbp?: number | null;
    fx_rate_usd?: number | null;
    price?: number | null;
    media_cost?: number | null;
    gross_budget?: number | null;
    extra_data?: unknown | null;
    opportunity_record_type?: string | null;
    stage?: string | null;
  } & Projects_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListProjects`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListProjects } from '@dataconnect/generated/react'

export default function ListProjectsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListProjects();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListProjects(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListProjects(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListProjects(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.projectss);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetProject
You can execute the `GetProject` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetProject(dc: DataConnect, vars: GetProjectVariables, options?: useDataConnectQueryOptions<GetProjectData>): UseDataConnectQueryResult<GetProjectData, GetProjectVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetProject(vars: GetProjectVariables, options?: useDataConnectQueryOptions<GetProjectData>): UseDataConnectQueryResult<GetProjectData, GetProjectVariables>;
```

### Variables
The `GetProject` Query requires an argument of type `GetProjectVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetProjectVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `GetProject` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetProject` Query is of type `GetProjectData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetProjectData {
  projects?: {
    id: UUIDString;
    title: string;
  } & Projects_Key;
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetProject`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetProjectVariables } from '@dataconnect/generated';
import { useGetProject } from '@dataconnect/generated/react'

export default function GetProjectComponent() {
  // The `useGetProject` Query hook requires an argument of type `GetProjectVariables`:
  const getProjectVars: GetProjectVariables = {
    id: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetProject(getProjectVars);
  // Variables can be defined inline as well.
  const query = useGetProject({ id: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetProject(dataConnect, getProjectVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetProject(getProjectVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetProject(dataConnect, getProjectVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.projects);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListPeople
You can execute the `ListPeople` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListPeople(dc: DataConnect, options?: useDataConnectQueryOptions<ListPeopleData>): UseDataConnectQueryResult<ListPeopleData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListPeople(options?: useDataConnectQueryOptions<ListPeopleData>): UseDataConnectQueryResult<ListPeopleData, undefined>;
```

### Variables
The `ListPeople` Query has no variables.
### Return Type
Recall that calling the `ListPeople` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListPeople` Query is of type `ListPeopleData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListPeopleData {
  peoples: ({
    id: UUIDString;
    code?: string | null;
    name: string;
    team?: string | null;
    office: string;
    role_id?: UUIDString | null;
    overall_start_date?: DateString | null;
    overall_end_date?: DateString | null;
    employment_start_date?: DateString | null;
    employment_end_date?: DateString | null;
    status?: string | null;
    annual_salary?: number | null;
  } & People_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListPeople`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListPeople } from '@dataconnect/generated/react'

export default function ListPeopleComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListPeople();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListPeople(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListPeople(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListPeople(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.peoples);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListRoles
You can execute the `ListRoles` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListRoles(dc: DataConnect, options?: useDataConnectQueryOptions<ListRolesData>): UseDataConnectQueryResult<ListRolesData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListRoles(options?: useDataConnectQueryOptions<ListRolesData>): UseDataConnectQueryResult<ListRolesData, undefined>;
```

### Variables
The `ListRoles` Query has no variables.
### Return Type
Recall that calling the `ListRoles` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListRoles` Query is of type `ListRolesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListRolesData {
  roless: ({
    id: UUIDString;
    name: string;
    billable_capacity_hours: number;
  } & Roles_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListRoles`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListRoles } from '@dataconnect/generated/react'

export default function ListRolesComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListRoles();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListRoles(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListRoles(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListRoles(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.roless);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListRateCards
You can execute the `ListRateCards` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListRateCards(dc: DataConnect, options?: useDataConnectQueryOptions<ListRateCardsData>): UseDataConnectQueryResult<ListRateCardsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListRateCards(options?: useDataConnectQueryOptions<ListRateCardsData>): UseDataConnectQueryResult<ListRateCardsData, undefined>;
```

### Variables
The `ListRateCards` Query has no variables.
### Return Type
Recall that calling the `ListRateCards` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListRateCards` Query is of type `ListRateCardsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListRateCardsData {
  rateCardss: ({
    id: UUIDString;
    name: string;
    hourly_rate: number;
    currency: string;
    role_id?: UUIDString | null;
  } & RateCards_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListRateCards`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListRateCards } from '@dataconnect/generated/react'

export default function ListRateCardsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListRateCards();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListRateCards(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListRateCards(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListRateCards(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.rateCardss);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListTimeEntries
You can execute the `ListTimeEntries` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListTimeEntries(dc: DataConnect, options?: useDataConnectQueryOptions<ListTimeEntriesData>): UseDataConnectQueryResult<ListTimeEntriesData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListTimeEntries(options?: useDataConnectQueryOptions<ListTimeEntriesData>): UseDataConnectQueryResult<ListTimeEntriesData, undefined>;
```

### Variables
The `ListTimeEntries` Query has no variables.
### Return Type
Recall that calling the `ListTimeEntries` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListTimeEntries` Query is of type `ListTimeEntriesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListTimeEntriesData {
  timeEntriess: ({
    id: UUIDString;
    date: DateString;
    hours: number;
    notes?: string | null;
    project_id?: UUIDString | null;
    person_id?: UUIDString | null;
  } & TimeEntries_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListTimeEntries`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListTimeEntries } from '@dataconnect/generated/react'

export default function ListTimeEntriesComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListTimeEntries();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListTimeEntries(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListTimeEntries(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListTimeEntries(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.timeEntriess);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListTimeEntriesByProject
You can execute the `ListTimeEntriesByProject` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListTimeEntriesByProject(dc: DataConnect, vars: ListTimeEntriesByProjectVariables, options?: useDataConnectQueryOptions<ListTimeEntriesByProjectData>): UseDataConnectQueryResult<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListTimeEntriesByProject(vars: ListTimeEntriesByProjectVariables, options?: useDataConnectQueryOptions<ListTimeEntriesByProjectData>): UseDataConnectQueryResult<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;
```

### Variables
The `ListTimeEntriesByProject` Query requires an argument of type `ListTimeEntriesByProjectVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface ListTimeEntriesByProjectVariables {
  projectId: UUIDString;
}
```
### Return Type
Recall that calling the `ListTimeEntriesByProject` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListTimeEntriesByProject` Query is of type `ListTimeEntriesByProjectData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListTimeEntriesByProjectData {
  timeEntriess: ({
    id: UUIDString;
    date: DateString;
    hours: number;
    notes?: string | null;
    project_id?: UUIDString | null;
    person_id?: UUIDString | null;
  } & TimeEntries_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListTimeEntriesByProject`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, ListTimeEntriesByProjectVariables } from '@dataconnect/generated';
import { useListTimeEntriesByProject } from '@dataconnect/generated/react'

export default function ListTimeEntriesByProjectComponent() {
  // The `useListTimeEntriesByProject` Query hook requires an argument of type `ListTimeEntriesByProjectVariables`:
  const listTimeEntriesByProjectVars: ListTimeEntriesByProjectVariables = {
    projectId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListTimeEntriesByProject(listTimeEntriesByProjectVars);
  // Variables can be defined inline as well.
  const query = useListTimeEntriesByProject({ projectId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListTimeEntriesByProject(dataConnect, listTimeEntriesByProjectVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListTimeEntriesByProject(listTimeEntriesByProjectVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListTimeEntriesByProject(dataConnect, listTimeEntriesByProjectVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.timeEntriess);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListProjectPhases
You can execute the `ListProjectPhases` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListProjectPhases(dc: DataConnect, options?: useDataConnectQueryOptions<ListProjectPhasesData>): UseDataConnectQueryResult<ListProjectPhasesData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListProjectPhases(options?: useDataConnectQueryOptions<ListProjectPhasesData>): UseDataConnectQueryResult<ListProjectPhasesData, undefined>;
```

### Variables
The `ListProjectPhases` Query has no variables.
### Return Type
Recall that calling the `ListProjectPhases` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListProjectPhases` Query is of type `ListProjectPhasesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListProjectPhasesData {
  projectPhasess: ({
    id: UUIDString;
    project_id: UUIDString;
    phase_name: string;
    start_date?: DateString | null;
    end_date?: DateString | null;
    sort_order: number;
  } & ProjectPhases_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListProjectPhases`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListProjectPhases } from '@dataconnect/generated/react'

export default function ListProjectPhasesComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListProjectPhases();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListProjectPhases(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListProjectPhases(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListProjectPhases(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.projectPhasess);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListAllocations
You can execute the `ListAllocations` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListAllocations(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllocationsData>): UseDataConnectQueryResult<ListAllocationsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListAllocations(options?: useDataConnectQueryOptions<ListAllocationsData>): UseDataConnectQueryResult<ListAllocationsData, undefined>;
```

### Variables
The `ListAllocations` Query has no variables.
### Return Type
Recall that calling the `ListAllocations` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListAllocations` Query is of type `ListAllocationsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListAllocationsData {
  allocationss: ({
    id: UUIDString;
    person_id?: UUIDString | null;
    project_scope_id?: UUIDString | null;
    allocated_hours: number;
  } & Allocations_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListAllocations`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListAllocations } from '@dataconnect/generated/react'

export default function ListAllocationsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListAllocations();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListAllocations(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListAllocations(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListAllocations(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.allocationss);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListDataImports
You can execute the `ListDataImports` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListDataImports(dc: DataConnect, options?: useDataConnectQueryOptions<ListDataImportsData>): UseDataConnectQueryResult<ListDataImportsData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListDataImports(options?: useDataConnectQueryOptions<ListDataImportsData>): UseDataConnectQueryResult<ListDataImportsData, undefined>;
```

### Variables
The `ListDataImports` Query has no variables.
### Return Type
Recall that calling the `ListDataImports` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListDataImports` Query is of type `ListDataImportsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListDataImportsData {
  dataImportss: ({
    dataset: string;
    last_imported_at: string;
    row_count: number;
  })[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListDataImports`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListDataImports } from '@dataconnect/generated/react'

export default function ListDataImportsComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListDataImports();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListDataImports(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListDataImports(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListDataImports(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.dataImportss);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetAppUserByEmail
You can execute the `GetAppUserByEmail` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useGetAppUserByEmail(dc: DataConnect, vars: GetAppUserByEmailVariables, options?: useDataConnectQueryOptions<GetAppUserByEmailData>): UseDataConnectQueryResult<GetAppUserByEmailData, GetAppUserByEmailVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetAppUserByEmail(vars: GetAppUserByEmailVariables, options?: useDataConnectQueryOptions<GetAppUserByEmailData>): UseDataConnectQueryResult<GetAppUserByEmailData, GetAppUserByEmailVariables>;
```

### Variables
The `GetAppUserByEmail` Query requires an argument of type `GetAppUserByEmailVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAppUserByEmailVariables {
  email: string;
}
```
### Return Type
Recall that calling the `GetAppUserByEmail` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetAppUserByEmail` Query is of type `GetAppUserByEmailData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetAppUserByEmailData {
  appUserss: ({
    id: UUIDString;
    email: string;
    role: string;
    createdAt: DateString;
    addedBy?: string | null;
  } & AppUsers_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetAppUserByEmail`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetAppUserByEmailVariables } from '@dataconnect/generated';
import { useGetAppUserByEmail } from '@dataconnect/generated/react'

export default function GetAppUserByEmailComponent() {
  // The `useGetAppUserByEmail` Query hook requires an argument of type `GetAppUserByEmailVariables`:
  const getAppUserByEmailVars: GetAppUserByEmailVariables = {
    email: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetAppUserByEmail(getAppUserByEmailVars);
  // Variables can be defined inline as well.
  const query = useGetAppUserByEmail({ email: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetAppUserByEmail(dataConnect, getAppUserByEmailVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetAppUserByEmail(getAppUserByEmailVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetAppUserByEmail(dataConnect, getAppUserByEmailVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.appUserss);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## ListAppUsers
You can execute the `ListAppUsers` Query using the following Query hook function, which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts):

```javascript
useListAppUsers(dc: DataConnect, options?: useDataConnectQueryOptions<ListAppUsersData>): UseDataConnectQueryResult<ListAppUsersData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useListAppUsers(options?: useDataConnectQueryOptions<ListAppUsersData>): UseDataConnectQueryResult<ListAppUsersData, undefined>;
```

### Variables
The `ListAppUsers` Query has no variables.
### Return Type
Recall that calling the `ListAppUsers` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `ListAppUsers` Query is of type `ListAppUsersData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface ListAppUsersData {
  appUserss: ({
    id: UUIDString;
    email: string;
    role: string;
    createdAt: DateString;
    addedBy?: string | null;
  } & AppUsers_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `ListAppUsers`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';
import { useListAppUsers } from '@dataconnect/generated/react'

export default function ListAppUsersComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useListAppUsers();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useListAppUsers(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useListAppUsers(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useListAppUsers(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.appUserss);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

# Mutations

The React generated SDK provides Mutations hook functions that call and return [`useDataConnectMutation`](https://react-query-firebase.invertase.dev/react/data-connect/mutations) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, and the most recent data returned by the Mutation, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/mutations).

Mutation hooks do not execute their Mutations automatically when called. Rather, after calling the Mutation hook function and getting a `UseMutationResult` object, you must call the `UseMutationResult.mutate()` function to execute the Mutation.

To learn more about TanStack React Query's Mutations, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations).

## Using Mutation Hooks
Here's a general overview of how to use the generated Mutation hooks in your code:

- Mutation hook functions are not called with the arguments to the Mutation. Instead, arguments are passed to `UseMutationResult.mutate()`.
- If the Mutation has no variables, the `mutate()` function does not require arguments.
- If the Mutation has any required variables, the `mutate()` function will require at least one argument: an object that contains all the required variables for the Mutation.
- If the Mutation has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Mutation's variables are optional, the Mutation hook function does not require any arguments.
- Mutation hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Mutation hooks also accept an `options` argument of type `useDataConnectMutationOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-side-effects).
  - `UseMutationResult.mutate()` also accepts an `options` argument of type `useDataConnectMutationOptions`.
  - ***Special case:*** If the Mutation has no arguments (or all optional arguments and you wish to provide none), and you want to pass `options` to `UseMutationResult.mutate()`, you must pass `undefined` where you would normally pass the Mutation's arguments, and then may provide the options argument.

Below are examples of how to use the `example` connector's generated Mutation hook functions to execute each Mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## InsertAllocations
You can execute the `InsertAllocations` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertAllocations(options?: useDataConnectMutationOptions<InsertAllocationsData, FirebaseError, InsertAllocationsVariables>): UseDataConnectMutationResult<InsertAllocationsData, InsertAllocationsVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertAllocations(dc: DataConnect, options?: useDataConnectMutationOptions<InsertAllocationsData, FirebaseError, InsertAllocationsVariables>): UseDataConnectMutationResult<InsertAllocationsData, InsertAllocationsVariables>;
```

### Variables
The `InsertAllocations` Mutation requires an argument of type `InsertAllocationsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertAllocationsVariables {
  allocatedHours: number;
  createdAt: DateString;
  id: UUIDString;
  personId?: UUIDString | null;
  projectScopeId?: UUIDString | null;
}
```
### Return Type
Recall that calling the `InsertAllocations` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertAllocations` Mutation is of type `InsertAllocationsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertAllocationsData {
  allocations_insert: Allocations_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertAllocations`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertAllocationsVariables } from '@dataconnect/generated';
import { useInsertAllocations } from '@dataconnect/generated/react'

export default function InsertAllocationsComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertAllocations();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertAllocations(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertAllocations(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertAllocations(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertAllocations` Mutation requires an argument of type `InsertAllocationsVariables`:
  const insertAllocationsVars: InsertAllocationsVariables = {
    allocatedHours: ..., 
    createdAt: ..., 
    id: ..., 
    personId: ..., // optional
    projectScopeId: ..., // optional
  };
  mutation.mutate(insertAllocationsVars);
  // Variables can be defined inline as well.
  mutation.mutate({ allocatedHours: ..., createdAt: ..., id: ..., personId: ..., projectScopeId: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertAllocationsVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.allocations_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertBillabilityRuleConditions
You can execute the `InsertBillabilityRuleConditions` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertBillabilityRuleConditions(options?: useDataConnectMutationOptions<InsertBillabilityRuleConditionsData, FirebaseError, InsertBillabilityRuleConditionsVariables>): UseDataConnectMutationResult<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertBillabilityRuleConditions(dc: DataConnect, options?: useDataConnectMutationOptions<InsertBillabilityRuleConditionsData, FirebaseError, InsertBillabilityRuleConditionsVariables>): UseDataConnectMutationResult<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;
```

### Variables
The `InsertBillabilityRuleConditions` Mutation requires an argument of type `InsertBillabilityRuleConditionsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertBillabilityRuleConditionsVariables {
  createdAt: DateString;
  field: string;
  id: UUIDString;
  logicOperator: string;
  operator: string;
  ruleId: UUIDString;
  value: string;
}
```
### Return Type
Recall that calling the `InsertBillabilityRuleConditions` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertBillabilityRuleConditions` Mutation is of type `InsertBillabilityRuleConditionsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertBillabilityRuleConditionsData {
  billabilityRuleConditions_insert: BillabilityRuleConditions_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertBillabilityRuleConditions`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertBillabilityRuleConditionsVariables } from '@dataconnect/generated';
import { useInsertBillabilityRuleConditions } from '@dataconnect/generated/react'

export default function InsertBillabilityRuleConditionsComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertBillabilityRuleConditions();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertBillabilityRuleConditions(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertBillabilityRuleConditions(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertBillabilityRuleConditions(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertBillabilityRuleConditions` Mutation requires an argument of type `InsertBillabilityRuleConditionsVariables`:
  const insertBillabilityRuleConditionsVars: InsertBillabilityRuleConditionsVariables = {
    createdAt: ..., 
    field: ..., 
    id: ..., 
    logicOperator: ..., 
    operator: ..., 
    ruleId: ..., 
    value: ..., 
  };
  mutation.mutate(insertBillabilityRuleConditionsVars);
  // Variables can be defined inline as well.
  mutation.mutate({ createdAt: ..., field: ..., id: ..., logicOperator: ..., operator: ..., ruleId: ..., value: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertBillabilityRuleConditionsVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.billabilityRuleConditions_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertBillabilityRules
You can execute the `InsertBillabilityRules` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertBillabilityRules(options?: useDataConnectMutationOptions<InsertBillabilityRulesData, FirebaseError, InsertBillabilityRulesVariables>): UseDataConnectMutationResult<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertBillabilityRules(dc: DataConnect, options?: useDataConnectMutationOptions<InsertBillabilityRulesData, FirebaseError, InsertBillabilityRulesVariables>): UseDataConnectMutationResult<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;
```

### Variables
The `InsertBillabilityRules` Mutation requires an argument of type `InsertBillabilityRulesVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertBillabilityRulesVariables {
  createdAt: DateString;
  id: UUIDString;
  isBillable: boolean;
  logicOperator: string;
  name: string;
  priority: number;
}
```
### Return Type
Recall that calling the `InsertBillabilityRules` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertBillabilityRules` Mutation is of type `InsertBillabilityRulesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertBillabilityRulesData {
  billabilityRules_insert: BillabilityRules_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertBillabilityRules`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertBillabilityRulesVariables } from '@dataconnect/generated';
import { useInsertBillabilityRules } from '@dataconnect/generated/react'

export default function InsertBillabilityRulesComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertBillabilityRules();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertBillabilityRules(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertBillabilityRules(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertBillabilityRules(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertBillabilityRules` Mutation requires an argument of type `InsertBillabilityRulesVariables`:
  const insertBillabilityRulesVars: InsertBillabilityRulesVariables = {
    createdAt: ..., 
    id: ..., 
    isBillable: ..., 
    logicOperator: ..., 
    name: ..., 
    priority: ..., 
  };
  mutation.mutate(insertBillabilityRulesVars);
  // Variables can be defined inline as well.
  mutation.mutate({ createdAt: ..., id: ..., isBillable: ..., logicOperator: ..., name: ..., priority: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertBillabilityRulesVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.billabilityRules_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertClientTeamAllocations
You can execute the `InsertClientTeamAllocations` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertClientTeamAllocations(options?: useDataConnectMutationOptions<InsertClientTeamAllocationsData, FirebaseError, InsertClientTeamAllocationsVariables>): UseDataConnectMutationResult<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertClientTeamAllocations(dc: DataConnect, options?: useDataConnectMutationOptions<InsertClientTeamAllocationsData, FirebaseError, InsertClientTeamAllocationsVariables>): UseDataConnectMutationResult<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;
```

### Variables
The `InsertClientTeamAllocations` Mutation requires an argument of type `InsertClientTeamAllocationsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertClientTeamAllocationsVariables {
  clientName: string;
  createdAt: DateString;
  id: UUIDString;
  personId: UUIDString;
  priority: number;
  roleId: UUIDString;
}
```
### Return Type
Recall that calling the `InsertClientTeamAllocations` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertClientTeamAllocations` Mutation is of type `InsertClientTeamAllocationsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertClientTeamAllocationsData {
  clientTeamAllocations_insert: ClientTeamAllocations_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertClientTeamAllocations`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertClientTeamAllocationsVariables } from '@dataconnect/generated';
import { useInsertClientTeamAllocations } from '@dataconnect/generated/react'

export default function InsertClientTeamAllocationsComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertClientTeamAllocations();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertClientTeamAllocations(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertClientTeamAllocations(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertClientTeamAllocations(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertClientTeamAllocations` Mutation requires an argument of type `InsertClientTeamAllocationsVariables`:
  const insertClientTeamAllocationsVars: InsertClientTeamAllocationsVariables = {
    clientName: ..., 
    createdAt: ..., 
    id: ..., 
    personId: ..., 
    priority: ..., 
    roleId: ..., 
  };
  mutation.mutate(insertClientTeamAllocationsVars);
  // Variables can be defined inline as well.
  mutation.mutate({ clientName: ..., createdAt: ..., id: ..., personId: ..., priority: ..., roleId: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertClientTeamAllocationsVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.clientTeamAllocations_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertDailyAllocations
You can execute the `InsertDailyAllocations` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertDailyAllocations(options?: useDataConnectMutationOptions<InsertDailyAllocationsData, FirebaseError, InsertDailyAllocationsVariables>): UseDataConnectMutationResult<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertDailyAllocations(dc: DataConnect, options?: useDataConnectMutationOptions<InsertDailyAllocationsData, FirebaseError, InsertDailyAllocationsVariables>): UseDataConnectMutationResult<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;
```

### Variables
The `InsertDailyAllocations` Mutation requires an argument of type `InsertDailyAllocationsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertDailyAllocationsVariables {
  allocationId: UUIDString;
  createdAt: DateString;
  date: DateString;
  hours: number;
  id: UUIDString;
}
```
### Return Type
Recall that calling the `InsertDailyAllocations` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertDailyAllocations` Mutation is of type `InsertDailyAllocationsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertDailyAllocationsData {
  dailyAllocations_insert: DailyAllocations_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertDailyAllocations`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertDailyAllocationsVariables } from '@dataconnect/generated';
import { useInsertDailyAllocations } from '@dataconnect/generated/react'

export default function InsertDailyAllocationsComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertDailyAllocations();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertDailyAllocations(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertDailyAllocations(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertDailyAllocations(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertDailyAllocations` Mutation requires an argument of type `InsertDailyAllocationsVariables`:
  const insertDailyAllocationsVars: InsertDailyAllocationsVariables = {
    allocationId: ..., 
    createdAt: ..., 
    date: ..., 
    hours: ..., 
    id: ..., 
  };
  mutation.mutate(insertDailyAllocationsVars);
  // Variables can be defined inline as well.
  mutation.mutate({ allocationId: ..., createdAt: ..., date: ..., hours: ..., id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertDailyAllocationsVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.dailyAllocations_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertDataImports
You can execute the `InsertDataImports` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertDataImports(options?: useDataConnectMutationOptions<InsertDataImportsData, FirebaseError, InsertDataImportsVariables>): UseDataConnectMutationResult<InsertDataImportsData, InsertDataImportsVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertDataImports(dc: DataConnect, options?: useDataConnectMutationOptions<InsertDataImportsData, FirebaseError, InsertDataImportsVariables>): UseDataConnectMutationResult<InsertDataImportsData, InsertDataImportsVariables>;
```

### Variables
The `InsertDataImports` Mutation requires an argument of type `InsertDataImportsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertDataImportsVariables {
  dataset: string;
  id: UUIDString;
  lastImportedAt: string;
  rowCount: number;
}
```
### Return Type
Recall that calling the `InsertDataImports` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertDataImports` Mutation is of type `InsertDataImportsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertDataImportsData {
  dataImports_insert: DataImports_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertDataImports`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertDataImportsVariables } from '@dataconnect/generated';
import { useInsertDataImports } from '@dataconnect/generated/react'

export default function InsertDataImportsComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertDataImports();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertDataImports(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertDataImports(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertDataImports(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertDataImports` Mutation requires an argument of type `InsertDataImportsVariables`:
  const insertDataImportsVars: InsertDataImportsVariables = {
    dataset: ..., 
    id: ..., 
    lastImportedAt: ..., 
    rowCount: ..., 
  };
  mutation.mutate(insertDataImportsVars);
  // Variables can be defined inline as well.
  mutation.mutate({ dataset: ..., id: ..., lastImportedAt: ..., rowCount: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertDataImportsVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.dataImports_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertPeople
You can execute the `InsertPeople` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertPeople(options?: useDataConnectMutationOptions<InsertPeopleData, FirebaseError, InsertPeopleVariables>): UseDataConnectMutationResult<InsertPeopleData, InsertPeopleVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertPeople(dc: DataConnect, options?: useDataConnectMutationOptions<InsertPeopleData, FirebaseError, InsertPeopleVariables>): UseDataConnectMutationResult<InsertPeopleData, InsertPeopleVariables>;
```

### Variables
The `InsertPeople` Mutation requires an argument of type `InsertPeopleVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertPeopleVariables {
  annualSalary?: number | null;
  code?: string | null;
  createdAt: DateString;
  employmentEndDate?: DateString | null;
  employmentStartDate?: DateString | null;
  id: UUIDString;
  imcPercentage?: number | null;
  monthlySalary?: number | null;
  name: string;
  office: string;
  overallEndDate?: DateString | null;
  overallStartDate?: DateString | null;
  roleId?: UUIDString | null;
  status?: string | null;
  team?: string | null;
  type?: string | null;
  ukPercentage?: number | null;
  usPercentage?: number | null;
}
```
### Return Type
Recall that calling the `InsertPeople` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertPeople` Mutation is of type `InsertPeopleData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertPeopleData {
  people_insert: People_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertPeople`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertPeopleVariables } from '@dataconnect/generated';
import { useInsertPeople } from '@dataconnect/generated/react'

export default function InsertPeopleComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertPeople();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertPeople(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertPeople(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertPeople(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertPeople` Mutation requires an argument of type `InsertPeopleVariables`:
  const insertPeopleVars: InsertPeopleVariables = {
    annualSalary: ..., // optional
    code: ..., // optional
    createdAt: ..., 
    employmentEndDate: ..., // optional
    employmentStartDate: ..., // optional
    id: ..., 
    imcPercentage: ..., // optional
    monthlySalary: ..., // optional
    name: ..., 
    office: ..., 
    overallEndDate: ..., // optional
    overallStartDate: ..., // optional
    roleId: ..., // optional
    status: ..., // optional
    team: ..., // optional
    type: ..., // optional
    ukPercentage: ..., // optional
    usPercentage: ..., // optional
  };
  mutation.mutate(insertPeopleVars);
  // Variables can be defined inline as well.
  mutation.mutate({ annualSalary: ..., code: ..., createdAt: ..., employmentEndDate: ..., employmentStartDate: ..., id: ..., imcPercentage: ..., monthlySalary: ..., name: ..., office: ..., overallEndDate: ..., overallStartDate: ..., roleId: ..., status: ..., team: ..., type: ..., ukPercentage: ..., usPercentage: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertPeopleVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.people_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertPhaseAllocations
You can execute the `InsertPhaseAllocations` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertPhaseAllocations(options?: useDataConnectMutationOptions<InsertPhaseAllocationsData, FirebaseError, InsertPhaseAllocationsVariables>): UseDataConnectMutationResult<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertPhaseAllocations(dc: DataConnect, options?: useDataConnectMutationOptions<InsertPhaseAllocationsData, FirebaseError, InsertPhaseAllocationsVariables>): UseDataConnectMutationResult<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;
```

### Variables
The `InsertPhaseAllocations` Mutation requires an argument of type `InsertPhaseAllocationsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertPhaseAllocationsVariables {
  allocationId?: UUIDString | null;
  createdAt: DateString;
  hours: number;
  id: UUIDString;
  phaseId: UUIDString;
  projectScopeId?: UUIDString | null;
}
```
### Return Type
Recall that calling the `InsertPhaseAllocations` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertPhaseAllocations` Mutation is of type `InsertPhaseAllocationsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertPhaseAllocationsData {
  phaseAllocations_insert: PhaseAllocations_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertPhaseAllocations`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertPhaseAllocationsVariables } from '@dataconnect/generated';
import { useInsertPhaseAllocations } from '@dataconnect/generated/react'

export default function InsertPhaseAllocationsComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertPhaseAllocations();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertPhaseAllocations(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertPhaseAllocations(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertPhaseAllocations(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertPhaseAllocations` Mutation requires an argument of type `InsertPhaseAllocationsVariables`:
  const insertPhaseAllocationsVars: InsertPhaseAllocationsVariables = {
    allocationId: ..., // optional
    createdAt: ..., 
    hours: ..., 
    id: ..., 
    phaseId: ..., 
    projectScopeId: ..., // optional
  };
  mutation.mutate(insertPhaseAllocationsVars);
  // Variables can be defined inline as well.
  mutation.mutate({ allocationId: ..., createdAt: ..., hours: ..., id: ..., phaseId: ..., projectScopeId: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertPhaseAllocationsVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.phaseAllocations_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertProjectMonthlyRevenue
You can execute the `InsertProjectMonthlyRevenue` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertProjectMonthlyRevenue(options?: useDataConnectMutationOptions<InsertProjectMonthlyRevenueData, FirebaseError, InsertProjectMonthlyRevenueVariables>): UseDataConnectMutationResult<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertProjectMonthlyRevenue(dc: DataConnect, options?: useDataConnectMutationOptions<InsertProjectMonthlyRevenueData, FirebaseError, InsertProjectMonthlyRevenueVariables>): UseDataConnectMutationResult<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;
```

### Variables
The `InsertProjectMonthlyRevenue` Mutation requires an argument of type `InsertProjectMonthlyRevenueVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertProjectMonthlyRevenueVariables {
  createdAt: DateString;
  id: UUIDString;
  monthDate: DateString;
  projectId: UUIDString;
  value: number;
}
```
### Return Type
Recall that calling the `InsertProjectMonthlyRevenue` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertProjectMonthlyRevenue` Mutation is of type `InsertProjectMonthlyRevenueData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertProjectMonthlyRevenueData {
  projectMonthlyRevenue_insert: ProjectMonthlyRevenue_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertProjectMonthlyRevenue`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertProjectMonthlyRevenueVariables } from '@dataconnect/generated';
import { useInsertProjectMonthlyRevenue } from '@dataconnect/generated/react'

export default function InsertProjectMonthlyRevenueComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertProjectMonthlyRevenue();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertProjectMonthlyRevenue(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertProjectMonthlyRevenue(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertProjectMonthlyRevenue(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertProjectMonthlyRevenue` Mutation requires an argument of type `InsertProjectMonthlyRevenueVariables`:
  const insertProjectMonthlyRevenueVars: InsertProjectMonthlyRevenueVariables = {
    createdAt: ..., 
    id: ..., 
    monthDate: ..., 
    projectId: ..., 
    value: ..., 
  };
  mutation.mutate(insertProjectMonthlyRevenueVars);
  // Variables can be defined inline as well.
  mutation.mutate({ createdAt: ..., id: ..., monthDate: ..., projectId: ..., value: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertProjectMonthlyRevenueVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.projectMonthlyRevenue_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertProjectPhases
You can execute the `InsertProjectPhases` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertProjectPhases(options?: useDataConnectMutationOptions<InsertProjectPhasesData, FirebaseError, InsertProjectPhasesVariables>): UseDataConnectMutationResult<InsertProjectPhasesData, InsertProjectPhasesVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertProjectPhases(dc: DataConnect, options?: useDataConnectMutationOptions<InsertProjectPhasesData, FirebaseError, InsertProjectPhasesVariables>): UseDataConnectMutationResult<InsertProjectPhasesData, InsertProjectPhasesVariables>;
```

### Variables
The `InsertProjectPhases` Mutation requires an argument of type `InsertProjectPhasesVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertProjectPhasesVariables {
  createdAt: DateString;
  endDate?: DateString | null;
  id: UUIDString;
  phaseName: string;
  projectId: UUIDString;
  sortOrder: number;
  startDate?: DateString | null;
}
```
### Return Type
Recall that calling the `InsertProjectPhases` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertProjectPhases` Mutation is of type `InsertProjectPhasesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertProjectPhasesData {
  projectPhases_insert: ProjectPhases_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertProjectPhases`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertProjectPhasesVariables } from '@dataconnect/generated';
import { useInsertProjectPhases } from '@dataconnect/generated/react'

export default function InsertProjectPhasesComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertProjectPhases();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertProjectPhases(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertProjectPhases(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertProjectPhases(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertProjectPhases` Mutation requires an argument of type `InsertProjectPhasesVariables`:
  const insertProjectPhasesVars: InsertProjectPhasesVariables = {
    createdAt: ..., 
    endDate: ..., // optional
    id: ..., 
    phaseName: ..., 
    projectId: ..., 
    sortOrder: ..., 
    startDate: ..., // optional
  };
  mutation.mutate(insertProjectPhasesVars);
  // Variables can be defined inline as well.
  mutation.mutate({ createdAt: ..., endDate: ..., id: ..., phaseName: ..., projectId: ..., sortOrder: ..., startDate: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertProjectPhasesVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.projectPhases_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertProjectScopes
You can execute the `InsertProjectScopes` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertProjectScopes(options?: useDataConnectMutationOptions<InsertProjectScopesData, FirebaseError, InsertProjectScopesVariables>): UseDataConnectMutationResult<InsertProjectScopesData, InsertProjectScopesVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertProjectScopes(dc: DataConnect, options?: useDataConnectMutationOptions<InsertProjectScopesData, FirebaseError, InsertProjectScopesVariables>): UseDataConnectMutationResult<InsertProjectScopesData, InsertProjectScopesVariables>;
```

### Variables
The `InsertProjectScopes` Mutation requires an argument of type `InsertProjectScopesVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertProjectScopesVariables {
  createdAt: DateString;
  id: UUIDString;
  phasePercentages?: unknown | null;
  projectId?: UUIDString | null;
  roleId?: UUIDString | null;
  scopedHours: number;
}
```
### Return Type
Recall that calling the `InsertProjectScopes` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertProjectScopes` Mutation is of type `InsertProjectScopesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertProjectScopesData {
  projectScopes_insert: ProjectScopes_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertProjectScopes`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertProjectScopesVariables } from '@dataconnect/generated';
import { useInsertProjectScopes } from '@dataconnect/generated/react'

export default function InsertProjectScopesComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertProjectScopes();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertProjectScopes(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertProjectScopes(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertProjectScopes(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertProjectScopes` Mutation requires an argument of type `InsertProjectScopesVariables`:
  const insertProjectScopesVars: InsertProjectScopesVariables = {
    createdAt: ..., 
    id: ..., 
    phasePercentages: ..., // optional
    projectId: ..., // optional
    roleId: ..., // optional
    scopedHours: ..., 
  };
  mutation.mutate(insertProjectScopesVars);
  // Variables can be defined inline as well.
  mutation.mutate({ createdAt: ..., id: ..., phasePercentages: ..., projectId: ..., roleId: ..., scopedHours: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertProjectScopesVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.projectScopes_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertProjects
You can execute the `InsertProjects` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertProjects(options?: useDataConnectMutationOptions<InsertProjectsData, FirebaseError, InsertProjectsVariables>): UseDataConnectMutationResult<InsertProjectsData, InsertProjectsVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertProjects(dc: DataConnect, options?: useDataConnectMutationOptions<InsertProjectsData, FirebaseError, InsertProjectsVariables>): UseDataConnectMutationResult<InsertProjectsData, InsertProjectsVariables>;
```

### Variables
The `InsertProjects` Mutation requires an argument of type `InsertProjectsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertProjectsVariables {
  actualCost?: number | null;
  bdbHours?: number | null;
  budgetCost?: number | null;
  closeDate?: DateString | null;
  contractedInflCost?: number | null;
  createdAt: DateString;
  createdDate?: DateString | null;
  dealValueDerisked?: number | null;
  durationWeeks?: number | null;
  durationWeeksRounded?: number | null;
  endDate: DateString;
  endWeek?: string | null;
  extraData?: unknown | null;
  feeCalcCurrency?: string | null;
  fxLockDate?: DateString | null;
  fxRateGbp?: number | null;
  fxRateUsd?: number | null;
  gpCheck?: string | null;
  gpFullValue?: number | null;
  gpFullValuePerDay?: number | null;
  gpMarginPct?: number | null;
  grossBudget?: number | null;
  hardCosts?: number | null;
  hub?: string | null;
  id: UUIDString;
  industry?: string | null;
  inflProductionCosts?: number | null;
  lastFeeCalcUrl?: string | null;
  leadSource?: string | null;
  mediaCost?: number | null;
  newRepeat?: string | null;
  office?: string | null;
  opportunityNumber?: string | null;
  opportunityOwner?: string | null;
  opportunityRecordType?: string | null;
  originalLeadSource?: string | null;
  paidMediaFees?: number | null;
  parentAccount?: string | null;
  phase1End?: string | null;
  phase1Name?: string | null;
  phase1Start?: string | null;
  phase2End?: string | null;
  phase2Name?: string | null;
  phase2Start?: string | null;
  phase3End?: string | null;
  phase3Name?: string | null;
  phase3Start?: string | null;
  phase4End?: string | null;
  phase4Name?: string | null;
  phase4Start?: string | null;
  price?: number | null;
  probability?: number | null;
  rateCardDiscount: number;
  rateCardId?: UUIDString | null;
  revenue?: number | null;
  sfAccount?: string | null;
  stage?: string | null;
  startDate: DateString;
  startWeek?: string | null;
  title: string;
  totalFees?: number | null;
  ultimateParent?: string | null;
  updatedAt: DateString;
  valuePerWeekPhase1?: number | null;
  valuePerWeekPhase2?: number | null;
  valuePerWeekPhase3?: number | null;
  valuePerWeekPhase4?: number | null;
}
```
### Return Type
Recall that calling the `InsertProjects` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertProjects` Mutation is of type `InsertProjectsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertProjectsData {
  projects_insert: Projects_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertProjects`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertProjectsVariables } from '@dataconnect/generated';
import { useInsertProjects } from '@dataconnect/generated/react'

export default function InsertProjectsComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertProjects();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertProjects(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertProjects(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertProjects(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertProjects` Mutation requires an argument of type `InsertProjectsVariables`:
  const insertProjectsVars: InsertProjectsVariables = {
    actualCost: ..., // optional
    bdbHours: ..., // optional
    budgetCost: ..., // optional
    closeDate: ..., // optional
    contractedInflCost: ..., // optional
    createdAt: ..., 
    createdDate: ..., // optional
    dealValueDerisked: ..., // optional
    durationWeeks: ..., // optional
    durationWeeksRounded: ..., // optional
    endDate: ..., 
    endWeek: ..., // optional
    extraData: ..., // optional
    feeCalcCurrency: ..., // optional
    fxLockDate: ..., // optional
    fxRateGbp: ..., // optional
    fxRateUsd: ..., // optional
    gpCheck: ..., // optional
    gpFullValue: ..., // optional
    gpFullValuePerDay: ..., // optional
    gpMarginPct: ..., // optional
    grossBudget: ..., // optional
    hardCosts: ..., // optional
    hub: ..., // optional
    id: ..., 
    industry: ..., // optional
    inflProductionCosts: ..., // optional
    lastFeeCalcUrl: ..., // optional
    leadSource: ..., // optional
    mediaCost: ..., // optional
    newRepeat: ..., // optional
    office: ..., // optional
    opportunityNumber: ..., // optional
    opportunityOwner: ..., // optional
    opportunityRecordType: ..., // optional
    originalLeadSource: ..., // optional
    paidMediaFees: ..., // optional
    parentAccount: ..., // optional
    phase1End: ..., // optional
    phase1Name: ..., // optional
    phase1Start: ..., // optional
    phase2End: ..., // optional
    phase2Name: ..., // optional
    phase2Start: ..., // optional
    phase3End: ..., // optional
    phase3Name: ..., // optional
    phase3Start: ..., // optional
    phase4End: ..., // optional
    phase4Name: ..., // optional
    phase4Start: ..., // optional
    price: ..., // optional
    probability: ..., // optional
    rateCardDiscount: ..., 
    rateCardId: ..., // optional
    revenue: ..., // optional
    sfAccount: ..., // optional
    stage: ..., // optional
    startDate: ..., 
    startWeek: ..., // optional
    title: ..., 
    totalFees: ..., // optional
    ultimateParent: ..., // optional
    updatedAt: ..., 
    valuePerWeekPhase1: ..., // optional
    valuePerWeekPhase2: ..., // optional
    valuePerWeekPhase3: ..., // optional
    valuePerWeekPhase4: ..., // optional
  };
  mutation.mutate(insertProjectsVars);
  // Variables can be defined inline as well.
  mutation.mutate({ actualCost: ..., bdbHours: ..., budgetCost: ..., closeDate: ..., contractedInflCost: ..., createdAt: ..., createdDate: ..., dealValueDerisked: ..., durationWeeks: ..., durationWeeksRounded: ..., endDate: ..., endWeek: ..., extraData: ..., feeCalcCurrency: ..., fxLockDate: ..., fxRateGbp: ..., fxRateUsd: ..., gpCheck: ..., gpFullValue: ..., gpFullValuePerDay: ..., gpMarginPct: ..., grossBudget: ..., hardCosts: ..., hub: ..., id: ..., industry: ..., inflProductionCosts: ..., lastFeeCalcUrl: ..., leadSource: ..., mediaCost: ..., newRepeat: ..., office: ..., opportunityNumber: ..., opportunityOwner: ..., opportunityRecordType: ..., originalLeadSource: ..., paidMediaFees: ..., parentAccount: ..., phase1End: ..., phase1Name: ..., phase1Start: ..., phase2End: ..., phase2Name: ..., phase2Start: ..., phase3End: ..., phase3Name: ..., phase3Start: ..., phase4End: ..., phase4Name: ..., phase4Start: ..., price: ..., probability: ..., rateCardDiscount: ..., rateCardId: ..., revenue: ..., sfAccount: ..., stage: ..., startDate: ..., startWeek: ..., title: ..., totalFees: ..., ultimateParent: ..., updatedAt: ..., valuePerWeekPhase1: ..., valuePerWeekPhase2: ..., valuePerWeekPhase3: ..., valuePerWeekPhase4: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertProjectsVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.projects_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertRateCards
You can execute the `InsertRateCards` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertRateCards(options?: useDataConnectMutationOptions<InsertRateCardsData, FirebaseError, InsertRateCardsVariables>): UseDataConnectMutationResult<InsertRateCardsData, InsertRateCardsVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertRateCards(dc: DataConnect, options?: useDataConnectMutationOptions<InsertRateCardsData, FirebaseError, InsertRateCardsVariables>): UseDataConnectMutationResult<InsertRateCardsData, InsertRateCardsVariables>;
```

### Variables
The `InsertRateCards` Mutation requires an argument of type `InsertRateCardsVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertRateCardsVariables {
  createdAt: DateString;
  currency: string;
  hourlyRate: number;
  id: UUIDString;
  name: string;
  roleId?: UUIDString | null;
}
```
### Return Type
Recall that calling the `InsertRateCards` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertRateCards` Mutation is of type `InsertRateCardsData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertRateCardsData {
  rateCards_insert: RateCards_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertRateCards`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertRateCardsVariables } from '@dataconnect/generated';
import { useInsertRateCards } from '@dataconnect/generated/react'

export default function InsertRateCardsComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertRateCards();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertRateCards(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertRateCards(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertRateCards(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertRateCards` Mutation requires an argument of type `InsertRateCardsVariables`:
  const insertRateCardsVars: InsertRateCardsVariables = {
    createdAt: ..., 
    currency: ..., 
    hourlyRate: ..., 
    id: ..., 
    name: ..., 
    roleId: ..., // optional
  };
  mutation.mutate(insertRateCardsVars);
  // Variables can be defined inline as well.
  mutation.mutate({ createdAt: ..., currency: ..., hourlyRate: ..., id: ..., name: ..., roleId: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertRateCardsVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.rateCards_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertRoles
You can execute the `InsertRoles` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertRoles(options?: useDataConnectMutationOptions<InsertRolesData, FirebaseError, InsertRolesVariables>): UseDataConnectMutationResult<InsertRolesData, InsertRolesVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertRoles(dc: DataConnect, options?: useDataConnectMutationOptions<InsertRolesData, FirebaseError, InsertRolesVariables>): UseDataConnectMutationResult<InsertRolesData, InsertRolesVariables>;
```

### Variables
The `InsertRoles` Mutation requires an argument of type `InsertRolesVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertRolesVariables {
  billableCapacityHours: number;
  createdAt: DateString;
  id: UUIDString;
  name: string;
}
```
### Return Type
Recall that calling the `InsertRoles` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertRoles` Mutation is of type `InsertRolesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertRolesData {
  roles_insert: Roles_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertRoles`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertRolesVariables } from '@dataconnect/generated';
import { useInsertRoles } from '@dataconnect/generated/react'

export default function InsertRolesComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertRoles();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertRoles(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertRoles(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertRoles(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertRoles` Mutation requires an argument of type `InsertRolesVariables`:
  const insertRolesVars: InsertRolesVariables = {
    billableCapacityHours: ..., 
    createdAt: ..., 
    id: ..., 
    name: ..., 
  };
  mutation.mutate(insertRolesVars);
  // Variables can be defined inline as well.
  mutation.mutate({ billableCapacityHours: ..., createdAt: ..., id: ..., name: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertRolesVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.roles_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## InsertTimeEntries
You can execute the `InsertTimeEntries` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useInsertTimeEntries(options?: useDataConnectMutationOptions<InsertTimeEntriesData, FirebaseError, InsertTimeEntriesVariables>): UseDataConnectMutationResult<InsertTimeEntriesData, InsertTimeEntriesVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useInsertTimeEntries(dc: DataConnect, options?: useDataConnectMutationOptions<InsertTimeEntriesData, FirebaseError, InsertTimeEntriesVariables>): UseDataConnectMutationResult<InsertTimeEntriesData, InsertTimeEntriesVariables>;
```

### Variables
The `InsertTimeEntries` Mutation requires an argument of type `InsertTimeEntriesVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface InsertTimeEntriesVariables {
  createdAt: DateString;
  date: DateString;
  hours: number;
  id: UUIDString;
  notes?: string | null;
  personId?: UUIDString | null;
  personName?: string | null;
  projectCode?: string | null;
  projectId?: UUIDString | null;
  projectName?: string | null;
}
```
### Return Type
Recall that calling the `InsertTimeEntries` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `InsertTimeEntries` Mutation is of type `InsertTimeEntriesData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface InsertTimeEntriesData {
  timeEntries_insert: TimeEntries_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `InsertTimeEntries`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, InsertTimeEntriesVariables } from '@dataconnect/generated';
import { useInsertTimeEntries } from '@dataconnect/generated/react'

export default function InsertTimeEntriesComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useInsertTimeEntries();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useInsertTimeEntries(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertTimeEntries(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useInsertTimeEntries(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useInsertTimeEntries` Mutation requires an argument of type `InsertTimeEntriesVariables`:
  const insertTimeEntriesVars: InsertTimeEntriesVariables = {
    createdAt: ..., 
    date: ..., 
    hours: ..., 
    id: ..., 
    notes: ..., // optional
    personId: ..., // optional
    personName: ..., // optional
    projectCode: ..., // optional
    projectId: ..., // optional
    projectName: ..., // optional
  };
  mutation.mutate(insertTimeEntriesVars);
  // Variables can be defined inline as well.
  mutation.mutate({ createdAt: ..., date: ..., hours: ..., id: ..., notes: ..., personId: ..., personName: ..., projectCode: ..., projectId: ..., projectName: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(insertTimeEntriesVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.timeEntries_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateAppUser
You can execute the `CreateAppUser` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useCreateAppUser(options?: useDataConnectMutationOptions<CreateAppUserData, FirebaseError, CreateAppUserVariables>): UseDataConnectMutationResult<CreateAppUserData, CreateAppUserVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateAppUser(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAppUserData, FirebaseError, CreateAppUserVariables>): UseDataConnectMutationResult<CreateAppUserData, CreateAppUserVariables>;
```

### Variables
The `CreateAppUser` Mutation requires an argument of type `CreateAppUserVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateAppUserVariables {
  email: string;
  role: string;
  addedBy?: string | null;
}
```
### Return Type
Recall that calling the `CreateAppUser` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateAppUser` Mutation is of type `CreateAppUserData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateAppUserData {
  appUsers_insert: AppUsers_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateAppUser`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateAppUserVariables } from '@dataconnect/generated';
import { useCreateAppUser } from '@dataconnect/generated/react'

export default function CreateAppUserComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateAppUser();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateAppUser(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAppUser(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAppUser(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateAppUser` Mutation requires an argument of type `CreateAppUserVariables`:
  const createAppUserVars: CreateAppUserVariables = {
    email: ..., 
    role: ..., 
    addedBy: ..., // optional
  };
  mutation.mutate(createAppUserVars);
  // Variables can be defined inline as well.
  mutation.mutate({ email: ..., role: ..., addedBy: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createAppUserVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.appUsers_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## UpdateAppUser
You can execute the `UpdateAppUser` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useUpdateAppUser(options?: useDataConnectMutationOptions<UpdateAppUserData, FirebaseError, UpdateAppUserVariables>): UseDataConnectMutationResult<UpdateAppUserData, UpdateAppUserVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useUpdateAppUser(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateAppUserData, FirebaseError, UpdateAppUserVariables>): UseDataConnectMutationResult<UpdateAppUserData, UpdateAppUserVariables>;
```

### Variables
The `UpdateAppUser` Mutation requires an argument of type `UpdateAppUserVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface UpdateAppUserVariables {
  id: UUIDString;
  role: string;
}
```
### Return Type
Recall that calling the `UpdateAppUser` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `UpdateAppUser` Mutation is of type `UpdateAppUserData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface UpdateAppUserData {
  appUsers_update?: AppUsers_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `UpdateAppUser`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, UpdateAppUserVariables } from '@dataconnect/generated';
import { useUpdateAppUser } from '@dataconnect/generated/react'

export default function UpdateAppUserComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useUpdateAppUser();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useUpdateAppUser(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateAppUser(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useUpdateAppUser(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useUpdateAppUser` Mutation requires an argument of type `UpdateAppUserVariables`:
  const updateAppUserVars: UpdateAppUserVariables = {
    id: ..., 
    role: ..., 
  };
  mutation.mutate(updateAppUserVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., role: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(updateAppUserVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.appUsers_update);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## DeleteAppUser
You can execute the `DeleteAppUser` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [dataconnect-generated/react/index.d.ts](./index.d.ts)):
```javascript
useDeleteAppUser(options?: useDataConnectMutationOptions<DeleteAppUserData, FirebaseError, DeleteAppUserVariables>): UseDataConnectMutationResult<DeleteAppUserData, DeleteAppUserVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useDeleteAppUser(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteAppUserData, FirebaseError, DeleteAppUserVariables>): UseDataConnectMutationResult<DeleteAppUserData, DeleteAppUserVariables>;
```

### Variables
The `DeleteAppUser` Mutation requires an argument of type `DeleteAppUserVariables`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface DeleteAppUserVariables {
  id: UUIDString;
}
```
### Return Type
Recall that calling the `DeleteAppUser` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `DeleteAppUser` Mutation is of type `DeleteAppUserData`, which is defined in [dataconnect-generated/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface DeleteAppUserData {
  appUsers_delete?: AppUsers_Key | null;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `DeleteAppUser`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, DeleteAppUserVariables } from '@dataconnect/generated';
import { useDeleteAppUser } from '@dataconnect/generated/react'

export default function DeleteAppUserComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useDeleteAppUser();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useDeleteAppUser(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeleteAppUser(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useDeleteAppUser(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useDeleteAppUser` Mutation requires an argument of type `DeleteAppUserVariables`:
  const deleteAppUserVars: DeleteAppUserVariables = {
    id: ..., 
  };
  mutation.mutate(deleteAppUserVars);
  // Variables can be defined inline as well.
  mutation.mutate({ id: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(deleteAppUserVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.appUsers_delete);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

