# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
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

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListProjects
You can execute the `ListProjects` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listProjects(): QueryPromise<ListProjectsData, undefined>;

interface ListProjectsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProjectsData, undefined>;
}
export const listProjectsRef: ListProjectsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProjects(dc: DataConnect): QueryPromise<ListProjectsData, undefined>;

interface ListProjectsRef {
  ...
  (dc: DataConnect): QueryRef<ListProjectsData, undefined>;
}
export const listProjectsRef: ListProjectsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProjectsRef:
```typescript
const name = listProjectsRef.operationName;
console.log(name);
```

### Variables
The `ListProjects` query has no variables.
### Return Type
Recall that executing the `ListProjects` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProjectsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `ListProjects`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProjects } from '@dataconnect/generated';


// Call the `listProjects()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProjects();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProjects(dataConnect);

console.log(data.projectss);

// Or, you can use the `Promise` API.
listProjects().then((response) => {
  const data = response.data;
  console.log(data.projectss);
});
```

### Using `ListProjects`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProjectsRef } from '@dataconnect/generated';


// Call the `listProjectsRef()` function to get a reference to the query.
const ref = listProjectsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProjectsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.projectss);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.projectss);
});
```

## GetProject
You can execute the `GetProject` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getProject(vars: GetProjectVariables): QueryPromise<GetProjectData, GetProjectVariables>;

interface GetProjectRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProjectVariables): QueryRef<GetProjectData, GetProjectVariables>;
}
export const getProjectRef: GetProjectRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getProject(dc: DataConnect, vars: GetProjectVariables): QueryPromise<GetProjectData, GetProjectVariables>;

interface GetProjectRef {
  ...
  (dc: DataConnect, vars: GetProjectVariables): QueryRef<GetProjectData, GetProjectVariables>;
}
export const getProjectRef: GetProjectRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getProjectRef:
```typescript
const name = getProjectRef.operationName;
console.log(name);
```

### Variables
The `GetProject` query requires an argument of type `GetProjectVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetProjectVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `GetProject` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetProjectData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetProjectData {
  projects?: {
    id: UUIDString;
    title: string;
  } & Projects_Key;
}
```
### Using `GetProject`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getProject, GetProjectVariables } from '@dataconnect/generated';

// The `GetProject` query requires an argument of type `GetProjectVariables`:
const getProjectVars: GetProjectVariables = {
  id: ..., 
};

// Call the `getProject()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getProject(getProjectVars);
// Variables can be defined inline as well.
const { data } = await getProject({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getProject(dataConnect, getProjectVars);

console.log(data.projects);

// Or, you can use the `Promise` API.
getProject(getProjectVars).then((response) => {
  const data = response.data;
  console.log(data.projects);
});
```

### Using `GetProject`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getProjectRef, GetProjectVariables } from '@dataconnect/generated';

// The `GetProject` query requires an argument of type `GetProjectVariables`:
const getProjectVars: GetProjectVariables = {
  id: ..., 
};

// Call the `getProjectRef()` function to get a reference to the query.
const ref = getProjectRef(getProjectVars);
// Variables can be defined inline as well.
const ref = getProjectRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getProjectRef(dataConnect, getProjectVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.projects);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.projects);
});
```

## ListPeople
You can execute the `ListPeople` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listPeople(): QueryPromise<ListPeopleData, undefined>;

interface ListPeopleRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPeopleData, undefined>;
}
export const listPeopleRef: ListPeopleRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listPeople(dc: DataConnect): QueryPromise<ListPeopleData, undefined>;

interface ListPeopleRef {
  ...
  (dc: DataConnect): QueryRef<ListPeopleData, undefined>;
}
export const listPeopleRef: ListPeopleRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listPeopleRef:
```typescript
const name = listPeopleRef.operationName;
console.log(name);
```

### Variables
The `ListPeople` query has no variables.
### Return Type
Recall that executing the `ListPeople` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListPeopleData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `ListPeople`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listPeople } from '@dataconnect/generated';


// Call the `listPeople()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listPeople();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listPeople(dataConnect);

console.log(data.peoples);

// Or, you can use the `Promise` API.
listPeople().then((response) => {
  const data = response.data;
  console.log(data.peoples);
});
```

### Using `ListPeople`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listPeopleRef } from '@dataconnect/generated';


// Call the `listPeopleRef()` function to get a reference to the query.
const ref = listPeopleRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listPeopleRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.peoples);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.peoples);
});
```

## ListRoles
You can execute the `ListRoles` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listRoles(): QueryPromise<ListRolesData, undefined>;

interface ListRolesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRolesData, undefined>;
}
export const listRolesRef: ListRolesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRoles(dc: DataConnect): QueryPromise<ListRolesData, undefined>;

interface ListRolesRef {
  ...
  (dc: DataConnect): QueryRef<ListRolesData, undefined>;
}
export const listRolesRef: ListRolesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRolesRef:
```typescript
const name = listRolesRef.operationName;
console.log(name);
```

### Variables
The `ListRoles` query has no variables.
### Return Type
Recall that executing the `ListRoles` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRolesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListRolesData {
  roless: ({
    id: UUIDString;
    name: string;
    billable_capacity_hours: number;
  } & Roles_Key)[];
}
```
### Using `ListRoles`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRoles } from '@dataconnect/generated';


// Call the `listRoles()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRoles();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRoles(dataConnect);

console.log(data.roless);

// Or, you can use the `Promise` API.
listRoles().then((response) => {
  const data = response.data;
  console.log(data.roless);
});
```

### Using `ListRoles`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRolesRef } from '@dataconnect/generated';


// Call the `listRolesRef()` function to get a reference to the query.
const ref = listRolesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRolesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.roless);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.roless);
});
```

## ListRateCards
You can execute the `ListRateCards` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listRateCards(): QueryPromise<ListRateCardsData, undefined>;

interface ListRateCardsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRateCardsData, undefined>;
}
export const listRateCardsRef: ListRateCardsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listRateCards(dc: DataConnect): QueryPromise<ListRateCardsData, undefined>;

interface ListRateCardsRef {
  ...
  (dc: DataConnect): QueryRef<ListRateCardsData, undefined>;
}
export const listRateCardsRef: ListRateCardsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listRateCardsRef:
```typescript
const name = listRateCardsRef.operationName;
console.log(name);
```

### Variables
The `ListRateCards` query has no variables.
### Return Type
Recall that executing the `ListRateCards` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListRateCardsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `ListRateCards`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listRateCards } from '@dataconnect/generated';


// Call the `listRateCards()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listRateCards();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listRateCards(dataConnect);

console.log(data.rateCardss);

// Or, you can use the `Promise` API.
listRateCards().then((response) => {
  const data = response.data;
  console.log(data.rateCardss);
});
```

### Using `ListRateCards`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listRateCardsRef } from '@dataconnect/generated';


// Call the `listRateCardsRef()` function to get a reference to the query.
const ref = listRateCardsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listRateCardsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.rateCardss);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.rateCardss);
});
```

## ListTimeEntries
You can execute the `ListTimeEntries` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listTimeEntries(): QueryPromise<ListTimeEntriesData, undefined>;

interface ListTimeEntriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTimeEntriesData, undefined>;
}
export const listTimeEntriesRef: ListTimeEntriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTimeEntries(dc: DataConnect): QueryPromise<ListTimeEntriesData, undefined>;

interface ListTimeEntriesRef {
  ...
  (dc: DataConnect): QueryRef<ListTimeEntriesData, undefined>;
}
export const listTimeEntriesRef: ListTimeEntriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTimeEntriesRef:
```typescript
const name = listTimeEntriesRef.operationName;
console.log(name);
```

### Variables
The `ListTimeEntries` query has no variables.
### Return Type
Recall that executing the `ListTimeEntries` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTimeEntriesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `ListTimeEntries`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTimeEntries } from '@dataconnect/generated';


// Call the `listTimeEntries()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTimeEntries();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTimeEntries(dataConnect);

console.log(data.timeEntriess);

// Or, you can use the `Promise` API.
listTimeEntries().then((response) => {
  const data = response.data;
  console.log(data.timeEntriess);
});
```

### Using `ListTimeEntries`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTimeEntriesRef } from '@dataconnect/generated';


// Call the `listTimeEntriesRef()` function to get a reference to the query.
const ref = listTimeEntriesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTimeEntriesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.timeEntriess);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.timeEntriess);
});
```

## ListTimeEntriesByProject
You can execute the `ListTimeEntriesByProject` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listTimeEntriesByProject(vars: ListTimeEntriesByProjectVariables): QueryPromise<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;

interface ListTimeEntriesByProjectRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListTimeEntriesByProjectVariables): QueryRef<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;
}
export const listTimeEntriesByProjectRef: ListTimeEntriesByProjectRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listTimeEntriesByProject(dc: DataConnect, vars: ListTimeEntriesByProjectVariables): QueryPromise<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;

interface ListTimeEntriesByProjectRef {
  ...
  (dc: DataConnect, vars: ListTimeEntriesByProjectVariables): QueryRef<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;
}
export const listTimeEntriesByProjectRef: ListTimeEntriesByProjectRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listTimeEntriesByProjectRef:
```typescript
const name = listTimeEntriesByProjectRef.operationName;
console.log(name);
```

### Variables
The `ListTimeEntriesByProject` query requires an argument of type `ListTimeEntriesByProjectVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface ListTimeEntriesByProjectVariables {
  projectId: UUIDString;
}
```
### Return Type
Recall that executing the `ListTimeEntriesByProject` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListTimeEntriesByProjectData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `ListTimeEntriesByProject`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listTimeEntriesByProject, ListTimeEntriesByProjectVariables } from '@dataconnect/generated';

// The `ListTimeEntriesByProject` query requires an argument of type `ListTimeEntriesByProjectVariables`:
const listTimeEntriesByProjectVars: ListTimeEntriesByProjectVariables = {
  projectId: ..., 
};

// Call the `listTimeEntriesByProject()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listTimeEntriesByProject(listTimeEntriesByProjectVars);
// Variables can be defined inline as well.
const { data } = await listTimeEntriesByProject({ projectId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listTimeEntriesByProject(dataConnect, listTimeEntriesByProjectVars);

console.log(data.timeEntriess);

// Or, you can use the `Promise` API.
listTimeEntriesByProject(listTimeEntriesByProjectVars).then((response) => {
  const data = response.data;
  console.log(data.timeEntriess);
});
```

### Using `ListTimeEntriesByProject`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listTimeEntriesByProjectRef, ListTimeEntriesByProjectVariables } from '@dataconnect/generated';

// The `ListTimeEntriesByProject` query requires an argument of type `ListTimeEntriesByProjectVariables`:
const listTimeEntriesByProjectVars: ListTimeEntriesByProjectVariables = {
  projectId: ..., 
};

// Call the `listTimeEntriesByProjectRef()` function to get a reference to the query.
const ref = listTimeEntriesByProjectRef(listTimeEntriesByProjectVars);
// Variables can be defined inline as well.
const ref = listTimeEntriesByProjectRef({ projectId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listTimeEntriesByProjectRef(dataConnect, listTimeEntriesByProjectVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.timeEntriess);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.timeEntriess);
});
```

## ListProjectPhases
You can execute the `ListProjectPhases` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listProjectPhases(): QueryPromise<ListProjectPhasesData, undefined>;

interface ListProjectPhasesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProjectPhasesData, undefined>;
}
export const listProjectPhasesRef: ListProjectPhasesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listProjectPhases(dc: DataConnect): QueryPromise<ListProjectPhasesData, undefined>;

interface ListProjectPhasesRef {
  ...
  (dc: DataConnect): QueryRef<ListProjectPhasesData, undefined>;
}
export const listProjectPhasesRef: ListProjectPhasesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listProjectPhasesRef:
```typescript
const name = listProjectPhasesRef.operationName;
console.log(name);
```

### Variables
The `ListProjectPhases` query has no variables.
### Return Type
Recall that executing the `ListProjectPhases` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListProjectPhasesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `ListProjectPhases`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listProjectPhases } from '@dataconnect/generated';


// Call the `listProjectPhases()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listProjectPhases();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listProjectPhases(dataConnect);

console.log(data.projectPhasess);

// Or, you can use the `Promise` API.
listProjectPhases().then((response) => {
  const data = response.data;
  console.log(data.projectPhasess);
});
```

### Using `ListProjectPhases`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listProjectPhasesRef } from '@dataconnect/generated';


// Call the `listProjectPhasesRef()` function to get a reference to the query.
const ref = listProjectPhasesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listProjectPhasesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.projectPhasess);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.projectPhasess);
});
```

## ListAllocations
You can execute the `ListAllocations` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAllocations(): QueryPromise<ListAllocationsData, undefined>;

interface ListAllocationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllocationsData, undefined>;
}
export const listAllocationsRef: ListAllocationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllocations(dc: DataConnect): QueryPromise<ListAllocationsData, undefined>;

interface ListAllocationsRef {
  ...
  (dc: DataConnect): QueryRef<ListAllocationsData, undefined>;
}
export const listAllocationsRef: ListAllocationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllocationsRef:
```typescript
const name = listAllocationsRef.operationName;
console.log(name);
```

### Variables
The `ListAllocations` query has no variables.
### Return Type
Recall that executing the `ListAllocations` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllocationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAllocationsData {
  allocationss: ({
    id: UUIDString;
    person_id?: UUIDString | null;
    project_scope_id?: UUIDString | null;
    allocated_hours: number;
  } & Allocations_Key)[];
}
```
### Using `ListAllocations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllocations } from '@dataconnect/generated';


// Call the `listAllocations()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllocations();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllocations(dataConnect);

console.log(data.allocationss);

// Or, you can use the `Promise` API.
listAllocations().then((response) => {
  const data = response.data;
  console.log(data.allocationss);
});
```

### Using `ListAllocations`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllocationsRef } from '@dataconnect/generated';


// Call the `listAllocationsRef()` function to get a reference to the query.
const ref = listAllocationsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllocationsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.allocationss);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.allocationss);
});
```

## ListDataImports
You can execute the `ListDataImports` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listDataImports(): QueryPromise<ListDataImportsData, undefined>;

interface ListDataImportsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDataImportsData, undefined>;
}
export const listDataImportsRef: ListDataImportsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listDataImports(dc: DataConnect): QueryPromise<ListDataImportsData, undefined>;

interface ListDataImportsRef {
  ...
  (dc: DataConnect): QueryRef<ListDataImportsData, undefined>;
}
export const listDataImportsRef: ListDataImportsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listDataImportsRef:
```typescript
const name = listDataImportsRef.operationName;
console.log(name);
```

### Variables
The `ListDataImports` query has no variables.
### Return Type
Recall that executing the `ListDataImports` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListDataImportsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListDataImportsData {
  dataImportss: ({
    dataset: string;
    last_imported_at: string;
    row_count: number;
  })[];
}
```
### Using `ListDataImports`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listDataImports } from '@dataconnect/generated';


// Call the `listDataImports()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listDataImports();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listDataImports(dataConnect);

console.log(data.dataImportss);

// Or, you can use the `Promise` API.
listDataImports().then((response) => {
  const data = response.data;
  console.log(data.dataImportss);
});
```

### Using `ListDataImports`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listDataImportsRef } from '@dataconnect/generated';


// Call the `listDataImportsRef()` function to get a reference to the query.
const ref = listDataImportsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listDataImportsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.dataImportss);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.dataImportss);
});
```

## GetAppUserByEmail
You can execute the `GetAppUserByEmail` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getAppUserByEmail(vars: GetAppUserByEmailVariables): QueryPromise<GetAppUserByEmailData, GetAppUserByEmailVariables>;

interface GetAppUserByEmailRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAppUserByEmailVariables): QueryRef<GetAppUserByEmailData, GetAppUserByEmailVariables>;
}
export const getAppUserByEmailRef: GetAppUserByEmailRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAppUserByEmail(dc: DataConnect, vars: GetAppUserByEmailVariables): QueryPromise<GetAppUserByEmailData, GetAppUserByEmailVariables>;

interface GetAppUserByEmailRef {
  ...
  (dc: DataConnect, vars: GetAppUserByEmailVariables): QueryRef<GetAppUserByEmailData, GetAppUserByEmailVariables>;
}
export const getAppUserByEmailRef: GetAppUserByEmailRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAppUserByEmailRef:
```typescript
const name = getAppUserByEmailRef.operationName;
console.log(name);
```

### Variables
The `GetAppUserByEmail` query requires an argument of type `GetAppUserByEmailVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetAppUserByEmailVariables {
  email: string;
}
```
### Return Type
Recall that executing the `GetAppUserByEmail` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAppUserByEmailData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetAppUserByEmail`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAppUserByEmail, GetAppUserByEmailVariables } from '@dataconnect/generated';

// The `GetAppUserByEmail` query requires an argument of type `GetAppUserByEmailVariables`:
const getAppUserByEmailVars: GetAppUserByEmailVariables = {
  email: ..., 
};

// Call the `getAppUserByEmail()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAppUserByEmail(getAppUserByEmailVars);
// Variables can be defined inline as well.
const { data } = await getAppUserByEmail({ email: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAppUserByEmail(dataConnect, getAppUserByEmailVars);

console.log(data.appUserss);

// Or, you can use the `Promise` API.
getAppUserByEmail(getAppUserByEmailVars).then((response) => {
  const data = response.data;
  console.log(data.appUserss);
});
```

### Using `GetAppUserByEmail`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAppUserByEmailRef, GetAppUserByEmailVariables } from '@dataconnect/generated';

// The `GetAppUserByEmail` query requires an argument of type `GetAppUserByEmailVariables`:
const getAppUserByEmailVars: GetAppUserByEmailVariables = {
  email: ..., 
};

// Call the `getAppUserByEmailRef()` function to get a reference to the query.
const ref = getAppUserByEmailRef(getAppUserByEmailVars);
// Variables can be defined inline as well.
const ref = getAppUserByEmailRef({ email: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAppUserByEmailRef(dataConnect, getAppUserByEmailVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.appUserss);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.appUserss);
});
```

## ListAppUsers
You can execute the `ListAppUsers` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAppUsers(): QueryPromise<ListAppUsersData, undefined>;

interface ListAppUsersRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAppUsersData, undefined>;
}
export const listAppUsersRef: ListAppUsersRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAppUsers(dc: DataConnect): QueryPromise<ListAppUsersData, undefined>;

interface ListAppUsersRef {
  ...
  (dc: DataConnect): QueryRef<ListAppUsersData, undefined>;
}
export const listAppUsersRef: ListAppUsersRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAppUsersRef:
```typescript
const name = listAppUsersRef.operationName;
console.log(name);
```

### Variables
The `ListAppUsers` query has no variables.
### Return Type
Recall that executing the `ListAppUsers` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAppUsersData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `ListAppUsers`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAppUsers } from '@dataconnect/generated';


// Call the `listAppUsers()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAppUsers();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAppUsers(dataConnect);

console.log(data.appUserss);

// Or, you can use the `Promise` API.
listAppUsers().then((response) => {
  const data = response.data;
  console.log(data.appUserss);
});
```

### Using `ListAppUsers`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAppUsersRef } from '@dataconnect/generated';


// Call the `listAppUsersRef()` function to get a reference to the query.
const ref = listAppUsersRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAppUsersRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.appUserss);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.appUserss);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## InsertAllocations
You can execute the `InsertAllocations` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertAllocations(vars: InsertAllocationsVariables): MutationPromise<InsertAllocationsData, InsertAllocationsVariables>;

interface InsertAllocationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertAllocationsVariables): MutationRef<InsertAllocationsData, InsertAllocationsVariables>;
}
export const insertAllocationsRef: InsertAllocationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertAllocations(dc: DataConnect, vars: InsertAllocationsVariables): MutationPromise<InsertAllocationsData, InsertAllocationsVariables>;

interface InsertAllocationsRef {
  ...
  (dc: DataConnect, vars: InsertAllocationsVariables): MutationRef<InsertAllocationsData, InsertAllocationsVariables>;
}
export const insertAllocationsRef: InsertAllocationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertAllocationsRef:
```typescript
const name = insertAllocationsRef.operationName;
console.log(name);
```

### Variables
The `InsertAllocations` mutation requires an argument of type `InsertAllocationsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertAllocationsVariables {
  allocatedHours: number;
  createdAt: DateString;
  id: UUIDString;
  personId?: UUIDString | null;
  projectScopeId?: UUIDString | null;
}
```
### Return Type
Recall that executing the `InsertAllocations` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertAllocationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertAllocationsData {
  allocations_insert: Allocations_Key;
}
```
### Using `InsertAllocations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertAllocations, InsertAllocationsVariables } from '@dataconnect/generated';

// The `InsertAllocations` mutation requires an argument of type `InsertAllocationsVariables`:
const insertAllocationsVars: InsertAllocationsVariables = {
  allocatedHours: ..., 
  createdAt: ..., 
  id: ..., 
  personId: ..., // optional
  projectScopeId: ..., // optional
};

// Call the `insertAllocations()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertAllocations(insertAllocationsVars);
// Variables can be defined inline as well.
const { data } = await insertAllocations({ allocatedHours: ..., createdAt: ..., id: ..., personId: ..., projectScopeId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertAllocations(dataConnect, insertAllocationsVars);

console.log(data.allocations_insert);

// Or, you can use the `Promise` API.
insertAllocations(insertAllocationsVars).then((response) => {
  const data = response.data;
  console.log(data.allocations_insert);
});
```

### Using `InsertAllocations`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertAllocationsRef, InsertAllocationsVariables } from '@dataconnect/generated';

// The `InsertAllocations` mutation requires an argument of type `InsertAllocationsVariables`:
const insertAllocationsVars: InsertAllocationsVariables = {
  allocatedHours: ..., 
  createdAt: ..., 
  id: ..., 
  personId: ..., // optional
  projectScopeId: ..., // optional
};

// Call the `insertAllocationsRef()` function to get a reference to the mutation.
const ref = insertAllocationsRef(insertAllocationsVars);
// Variables can be defined inline as well.
const ref = insertAllocationsRef({ allocatedHours: ..., createdAt: ..., id: ..., personId: ..., projectScopeId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertAllocationsRef(dataConnect, insertAllocationsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.allocations_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.allocations_insert);
});
```

## InsertBillabilityRuleConditions
You can execute the `InsertBillabilityRuleConditions` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertBillabilityRuleConditions(vars: InsertBillabilityRuleConditionsVariables): MutationPromise<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;

interface InsertBillabilityRuleConditionsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertBillabilityRuleConditionsVariables): MutationRef<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;
}
export const insertBillabilityRuleConditionsRef: InsertBillabilityRuleConditionsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertBillabilityRuleConditions(dc: DataConnect, vars: InsertBillabilityRuleConditionsVariables): MutationPromise<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;

interface InsertBillabilityRuleConditionsRef {
  ...
  (dc: DataConnect, vars: InsertBillabilityRuleConditionsVariables): MutationRef<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;
}
export const insertBillabilityRuleConditionsRef: InsertBillabilityRuleConditionsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertBillabilityRuleConditionsRef:
```typescript
const name = insertBillabilityRuleConditionsRef.operationName;
console.log(name);
```

### Variables
The `InsertBillabilityRuleConditions` mutation requires an argument of type `InsertBillabilityRuleConditionsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `InsertBillabilityRuleConditions` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertBillabilityRuleConditionsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertBillabilityRuleConditionsData {
  billabilityRuleConditions_insert: BillabilityRuleConditions_Key;
}
```
### Using `InsertBillabilityRuleConditions`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertBillabilityRuleConditions, InsertBillabilityRuleConditionsVariables } from '@dataconnect/generated';

// The `InsertBillabilityRuleConditions` mutation requires an argument of type `InsertBillabilityRuleConditionsVariables`:
const insertBillabilityRuleConditionsVars: InsertBillabilityRuleConditionsVariables = {
  createdAt: ..., 
  field: ..., 
  id: ..., 
  logicOperator: ..., 
  operator: ..., 
  ruleId: ..., 
  value: ..., 
};

// Call the `insertBillabilityRuleConditions()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertBillabilityRuleConditions(insertBillabilityRuleConditionsVars);
// Variables can be defined inline as well.
const { data } = await insertBillabilityRuleConditions({ createdAt: ..., field: ..., id: ..., logicOperator: ..., operator: ..., ruleId: ..., value: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertBillabilityRuleConditions(dataConnect, insertBillabilityRuleConditionsVars);

console.log(data.billabilityRuleConditions_insert);

// Or, you can use the `Promise` API.
insertBillabilityRuleConditions(insertBillabilityRuleConditionsVars).then((response) => {
  const data = response.data;
  console.log(data.billabilityRuleConditions_insert);
});
```

### Using `InsertBillabilityRuleConditions`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertBillabilityRuleConditionsRef, InsertBillabilityRuleConditionsVariables } from '@dataconnect/generated';

// The `InsertBillabilityRuleConditions` mutation requires an argument of type `InsertBillabilityRuleConditionsVariables`:
const insertBillabilityRuleConditionsVars: InsertBillabilityRuleConditionsVariables = {
  createdAt: ..., 
  field: ..., 
  id: ..., 
  logicOperator: ..., 
  operator: ..., 
  ruleId: ..., 
  value: ..., 
};

// Call the `insertBillabilityRuleConditionsRef()` function to get a reference to the mutation.
const ref = insertBillabilityRuleConditionsRef(insertBillabilityRuleConditionsVars);
// Variables can be defined inline as well.
const ref = insertBillabilityRuleConditionsRef({ createdAt: ..., field: ..., id: ..., logicOperator: ..., operator: ..., ruleId: ..., value: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertBillabilityRuleConditionsRef(dataConnect, insertBillabilityRuleConditionsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.billabilityRuleConditions_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.billabilityRuleConditions_insert);
});
```

## InsertBillabilityRules
You can execute the `InsertBillabilityRules` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertBillabilityRules(vars: InsertBillabilityRulesVariables): MutationPromise<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;

interface InsertBillabilityRulesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertBillabilityRulesVariables): MutationRef<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;
}
export const insertBillabilityRulesRef: InsertBillabilityRulesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertBillabilityRules(dc: DataConnect, vars: InsertBillabilityRulesVariables): MutationPromise<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;

interface InsertBillabilityRulesRef {
  ...
  (dc: DataConnect, vars: InsertBillabilityRulesVariables): MutationRef<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;
}
export const insertBillabilityRulesRef: InsertBillabilityRulesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertBillabilityRulesRef:
```typescript
const name = insertBillabilityRulesRef.operationName;
console.log(name);
```

### Variables
The `InsertBillabilityRules` mutation requires an argument of type `InsertBillabilityRulesVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `InsertBillabilityRules` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertBillabilityRulesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertBillabilityRulesData {
  billabilityRules_insert: BillabilityRules_Key;
}
```
### Using `InsertBillabilityRules`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertBillabilityRules, InsertBillabilityRulesVariables } from '@dataconnect/generated';

// The `InsertBillabilityRules` mutation requires an argument of type `InsertBillabilityRulesVariables`:
const insertBillabilityRulesVars: InsertBillabilityRulesVariables = {
  createdAt: ..., 
  id: ..., 
  isBillable: ..., 
  logicOperator: ..., 
  name: ..., 
  priority: ..., 
};

// Call the `insertBillabilityRules()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertBillabilityRules(insertBillabilityRulesVars);
// Variables can be defined inline as well.
const { data } = await insertBillabilityRules({ createdAt: ..., id: ..., isBillable: ..., logicOperator: ..., name: ..., priority: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertBillabilityRules(dataConnect, insertBillabilityRulesVars);

console.log(data.billabilityRules_insert);

// Or, you can use the `Promise` API.
insertBillabilityRules(insertBillabilityRulesVars).then((response) => {
  const data = response.data;
  console.log(data.billabilityRules_insert);
});
```

### Using `InsertBillabilityRules`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertBillabilityRulesRef, InsertBillabilityRulesVariables } from '@dataconnect/generated';

// The `InsertBillabilityRules` mutation requires an argument of type `InsertBillabilityRulesVariables`:
const insertBillabilityRulesVars: InsertBillabilityRulesVariables = {
  createdAt: ..., 
  id: ..., 
  isBillable: ..., 
  logicOperator: ..., 
  name: ..., 
  priority: ..., 
};

// Call the `insertBillabilityRulesRef()` function to get a reference to the mutation.
const ref = insertBillabilityRulesRef(insertBillabilityRulesVars);
// Variables can be defined inline as well.
const ref = insertBillabilityRulesRef({ createdAt: ..., id: ..., isBillable: ..., logicOperator: ..., name: ..., priority: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertBillabilityRulesRef(dataConnect, insertBillabilityRulesVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.billabilityRules_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.billabilityRules_insert);
});
```

## InsertClientTeamAllocations
You can execute the `InsertClientTeamAllocations` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertClientTeamAllocations(vars: InsertClientTeamAllocationsVariables): MutationPromise<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;

interface InsertClientTeamAllocationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertClientTeamAllocationsVariables): MutationRef<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;
}
export const insertClientTeamAllocationsRef: InsertClientTeamAllocationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertClientTeamAllocations(dc: DataConnect, vars: InsertClientTeamAllocationsVariables): MutationPromise<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;

interface InsertClientTeamAllocationsRef {
  ...
  (dc: DataConnect, vars: InsertClientTeamAllocationsVariables): MutationRef<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;
}
export const insertClientTeamAllocationsRef: InsertClientTeamAllocationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertClientTeamAllocationsRef:
```typescript
const name = insertClientTeamAllocationsRef.operationName;
console.log(name);
```

### Variables
The `InsertClientTeamAllocations` mutation requires an argument of type `InsertClientTeamAllocationsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `InsertClientTeamAllocations` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertClientTeamAllocationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertClientTeamAllocationsData {
  clientTeamAllocations_insert: ClientTeamAllocations_Key;
}
```
### Using `InsertClientTeamAllocations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertClientTeamAllocations, InsertClientTeamAllocationsVariables } from '@dataconnect/generated';

// The `InsertClientTeamAllocations` mutation requires an argument of type `InsertClientTeamAllocationsVariables`:
const insertClientTeamAllocationsVars: InsertClientTeamAllocationsVariables = {
  clientName: ..., 
  createdAt: ..., 
  id: ..., 
  personId: ..., 
  priority: ..., 
  roleId: ..., 
};

// Call the `insertClientTeamAllocations()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertClientTeamAllocations(insertClientTeamAllocationsVars);
// Variables can be defined inline as well.
const { data } = await insertClientTeamAllocations({ clientName: ..., createdAt: ..., id: ..., personId: ..., priority: ..., roleId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertClientTeamAllocations(dataConnect, insertClientTeamAllocationsVars);

console.log(data.clientTeamAllocations_insert);

// Or, you can use the `Promise` API.
insertClientTeamAllocations(insertClientTeamAllocationsVars).then((response) => {
  const data = response.data;
  console.log(data.clientTeamAllocations_insert);
});
```

### Using `InsertClientTeamAllocations`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertClientTeamAllocationsRef, InsertClientTeamAllocationsVariables } from '@dataconnect/generated';

// The `InsertClientTeamAllocations` mutation requires an argument of type `InsertClientTeamAllocationsVariables`:
const insertClientTeamAllocationsVars: InsertClientTeamAllocationsVariables = {
  clientName: ..., 
  createdAt: ..., 
  id: ..., 
  personId: ..., 
  priority: ..., 
  roleId: ..., 
};

// Call the `insertClientTeamAllocationsRef()` function to get a reference to the mutation.
const ref = insertClientTeamAllocationsRef(insertClientTeamAllocationsVars);
// Variables can be defined inline as well.
const ref = insertClientTeamAllocationsRef({ clientName: ..., createdAt: ..., id: ..., personId: ..., priority: ..., roleId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertClientTeamAllocationsRef(dataConnect, insertClientTeamAllocationsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.clientTeamAllocations_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.clientTeamAllocations_insert);
});
```

## InsertDailyAllocations
You can execute the `InsertDailyAllocations` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertDailyAllocations(vars: InsertDailyAllocationsVariables): MutationPromise<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;

interface InsertDailyAllocationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertDailyAllocationsVariables): MutationRef<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;
}
export const insertDailyAllocationsRef: InsertDailyAllocationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertDailyAllocations(dc: DataConnect, vars: InsertDailyAllocationsVariables): MutationPromise<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;

interface InsertDailyAllocationsRef {
  ...
  (dc: DataConnect, vars: InsertDailyAllocationsVariables): MutationRef<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;
}
export const insertDailyAllocationsRef: InsertDailyAllocationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertDailyAllocationsRef:
```typescript
const name = insertDailyAllocationsRef.operationName;
console.log(name);
```

### Variables
The `InsertDailyAllocations` mutation requires an argument of type `InsertDailyAllocationsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertDailyAllocationsVariables {
  allocationId: UUIDString;
  createdAt: DateString;
  date: DateString;
  hours: number;
  id: UUIDString;
}
```
### Return Type
Recall that executing the `InsertDailyAllocations` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertDailyAllocationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertDailyAllocationsData {
  dailyAllocations_insert: DailyAllocations_Key;
}
```
### Using `InsertDailyAllocations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertDailyAllocations, InsertDailyAllocationsVariables } from '@dataconnect/generated';

// The `InsertDailyAllocations` mutation requires an argument of type `InsertDailyAllocationsVariables`:
const insertDailyAllocationsVars: InsertDailyAllocationsVariables = {
  allocationId: ..., 
  createdAt: ..., 
  date: ..., 
  hours: ..., 
  id: ..., 
};

// Call the `insertDailyAllocations()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertDailyAllocations(insertDailyAllocationsVars);
// Variables can be defined inline as well.
const { data } = await insertDailyAllocations({ allocationId: ..., createdAt: ..., date: ..., hours: ..., id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertDailyAllocations(dataConnect, insertDailyAllocationsVars);

console.log(data.dailyAllocations_insert);

// Or, you can use the `Promise` API.
insertDailyAllocations(insertDailyAllocationsVars).then((response) => {
  const data = response.data;
  console.log(data.dailyAllocations_insert);
});
```

### Using `InsertDailyAllocations`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertDailyAllocationsRef, InsertDailyAllocationsVariables } from '@dataconnect/generated';

// The `InsertDailyAllocations` mutation requires an argument of type `InsertDailyAllocationsVariables`:
const insertDailyAllocationsVars: InsertDailyAllocationsVariables = {
  allocationId: ..., 
  createdAt: ..., 
  date: ..., 
  hours: ..., 
  id: ..., 
};

// Call the `insertDailyAllocationsRef()` function to get a reference to the mutation.
const ref = insertDailyAllocationsRef(insertDailyAllocationsVars);
// Variables can be defined inline as well.
const ref = insertDailyAllocationsRef({ allocationId: ..., createdAt: ..., date: ..., hours: ..., id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertDailyAllocationsRef(dataConnect, insertDailyAllocationsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.dailyAllocations_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.dailyAllocations_insert);
});
```

## InsertDataImports
You can execute the `InsertDataImports` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertDataImports(vars: InsertDataImportsVariables): MutationPromise<InsertDataImportsData, InsertDataImportsVariables>;

interface InsertDataImportsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertDataImportsVariables): MutationRef<InsertDataImportsData, InsertDataImportsVariables>;
}
export const insertDataImportsRef: InsertDataImportsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertDataImports(dc: DataConnect, vars: InsertDataImportsVariables): MutationPromise<InsertDataImportsData, InsertDataImportsVariables>;

interface InsertDataImportsRef {
  ...
  (dc: DataConnect, vars: InsertDataImportsVariables): MutationRef<InsertDataImportsData, InsertDataImportsVariables>;
}
export const insertDataImportsRef: InsertDataImportsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertDataImportsRef:
```typescript
const name = insertDataImportsRef.operationName;
console.log(name);
```

### Variables
The `InsertDataImports` mutation requires an argument of type `InsertDataImportsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertDataImportsVariables {
  dataset: string;
  id: UUIDString;
  lastImportedAt: string;
  rowCount: number;
}
```
### Return Type
Recall that executing the `InsertDataImports` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertDataImportsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertDataImportsData {
  dataImports_insert: DataImports_Key;
}
```
### Using `InsertDataImports`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertDataImports, InsertDataImportsVariables } from '@dataconnect/generated';

// The `InsertDataImports` mutation requires an argument of type `InsertDataImportsVariables`:
const insertDataImportsVars: InsertDataImportsVariables = {
  dataset: ..., 
  id: ..., 
  lastImportedAt: ..., 
  rowCount: ..., 
};

// Call the `insertDataImports()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertDataImports(insertDataImportsVars);
// Variables can be defined inline as well.
const { data } = await insertDataImports({ dataset: ..., id: ..., lastImportedAt: ..., rowCount: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertDataImports(dataConnect, insertDataImportsVars);

console.log(data.dataImports_insert);

// Or, you can use the `Promise` API.
insertDataImports(insertDataImportsVars).then((response) => {
  const data = response.data;
  console.log(data.dataImports_insert);
});
```

### Using `InsertDataImports`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertDataImportsRef, InsertDataImportsVariables } from '@dataconnect/generated';

// The `InsertDataImports` mutation requires an argument of type `InsertDataImportsVariables`:
const insertDataImportsVars: InsertDataImportsVariables = {
  dataset: ..., 
  id: ..., 
  lastImportedAt: ..., 
  rowCount: ..., 
};

// Call the `insertDataImportsRef()` function to get a reference to the mutation.
const ref = insertDataImportsRef(insertDataImportsVars);
// Variables can be defined inline as well.
const ref = insertDataImportsRef({ dataset: ..., id: ..., lastImportedAt: ..., rowCount: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertDataImportsRef(dataConnect, insertDataImportsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.dataImports_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.dataImports_insert);
});
```

## InsertPeople
You can execute the `InsertPeople` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertPeople(vars: InsertPeopleVariables): MutationPromise<InsertPeopleData, InsertPeopleVariables>;

interface InsertPeopleRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertPeopleVariables): MutationRef<InsertPeopleData, InsertPeopleVariables>;
}
export const insertPeopleRef: InsertPeopleRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertPeople(dc: DataConnect, vars: InsertPeopleVariables): MutationPromise<InsertPeopleData, InsertPeopleVariables>;

interface InsertPeopleRef {
  ...
  (dc: DataConnect, vars: InsertPeopleVariables): MutationRef<InsertPeopleData, InsertPeopleVariables>;
}
export const insertPeopleRef: InsertPeopleRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertPeopleRef:
```typescript
const name = insertPeopleRef.operationName;
console.log(name);
```

### Variables
The `InsertPeople` mutation requires an argument of type `InsertPeopleVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `InsertPeople` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertPeopleData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertPeopleData {
  people_insert: People_Key;
}
```
### Using `InsertPeople`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertPeople, InsertPeopleVariables } from '@dataconnect/generated';

// The `InsertPeople` mutation requires an argument of type `InsertPeopleVariables`:
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

// Call the `insertPeople()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertPeople(insertPeopleVars);
// Variables can be defined inline as well.
const { data } = await insertPeople({ annualSalary: ..., code: ..., createdAt: ..., employmentEndDate: ..., employmentStartDate: ..., id: ..., imcPercentage: ..., monthlySalary: ..., name: ..., office: ..., overallEndDate: ..., overallStartDate: ..., roleId: ..., status: ..., team: ..., type: ..., ukPercentage: ..., usPercentage: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertPeople(dataConnect, insertPeopleVars);

console.log(data.people_insert);

// Or, you can use the `Promise` API.
insertPeople(insertPeopleVars).then((response) => {
  const data = response.data;
  console.log(data.people_insert);
});
```

### Using `InsertPeople`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertPeopleRef, InsertPeopleVariables } from '@dataconnect/generated';

// The `InsertPeople` mutation requires an argument of type `InsertPeopleVariables`:
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

// Call the `insertPeopleRef()` function to get a reference to the mutation.
const ref = insertPeopleRef(insertPeopleVars);
// Variables can be defined inline as well.
const ref = insertPeopleRef({ annualSalary: ..., code: ..., createdAt: ..., employmentEndDate: ..., employmentStartDate: ..., id: ..., imcPercentage: ..., monthlySalary: ..., name: ..., office: ..., overallEndDate: ..., overallStartDate: ..., roleId: ..., status: ..., team: ..., type: ..., ukPercentage: ..., usPercentage: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertPeopleRef(dataConnect, insertPeopleVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.people_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.people_insert);
});
```

## InsertPhaseAllocations
You can execute the `InsertPhaseAllocations` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertPhaseAllocations(vars: InsertPhaseAllocationsVariables): MutationPromise<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;

interface InsertPhaseAllocationsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertPhaseAllocationsVariables): MutationRef<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;
}
export const insertPhaseAllocationsRef: InsertPhaseAllocationsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertPhaseAllocations(dc: DataConnect, vars: InsertPhaseAllocationsVariables): MutationPromise<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;

interface InsertPhaseAllocationsRef {
  ...
  (dc: DataConnect, vars: InsertPhaseAllocationsVariables): MutationRef<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;
}
export const insertPhaseAllocationsRef: InsertPhaseAllocationsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertPhaseAllocationsRef:
```typescript
const name = insertPhaseAllocationsRef.operationName;
console.log(name);
```

### Variables
The `InsertPhaseAllocations` mutation requires an argument of type `InsertPhaseAllocationsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `InsertPhaseAllocations` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertPhaseAllocationsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertPhaseAllocationsData {
  phaseAllocations_insert: PhaseAllocations_Key;
}
```
### Using `InsertPhaseAllocations`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertPhaseAllocations, InsertPhaseAllocationsVariables } from '@dataconnect/generated';

// The `InsertPhaseAllocations` mutation requires an argument of type `InsertPhaseAllocationsVariables`:
const insertPhaseAllocationsVars: InsertPhaseAllocationsVariables = {
  allocationId: ..., // optional
  createdAt: ..., 
  hours: ..., 
  id: ..., 
  phaseId: ..., 
  projectScopeId: ..., // optional
};

// Call the `insertPhaseAllocations()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertPhaseAllocations(insertPhaseAllocationsVars);
// Variables can be defined inline as well.
const { data } = await insertPhaseAllocations({ allocationId: ..., createdAt: ..., hours: ..., id: ..., phaseId: ..., projectScopeId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertPhaseAllocations(dataConnect, insertPhaseAllocationsVars);

console.log(data.phaseAllocations_insert);

// Or, you can use the `Promise` API.
insertPhaseAllocations(insertPhaseAllocationsVars).then((response) => {
  const data = response.data;
  console.log(data.phaseAllocations_insert);
});
```

### Using `InsertPhaseAllocations`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertPhaseAllocationsRef, InsertPhaseAllocationsVariables } from '@dataconnect/generated';

// The `InsertPhaseAllocations` mutation requires an argument of type `InsertPhaseAllocationsVariables`:
const insertPhaseAllocationsVars: InsertPhaseAllocationsVariables = {
  allocationId: ..., // optional
  createdAt: ..., 
  hours: ..., 
  id: ..., 
  phaseId: ..., 
  projectScopeId: ..., // optional
};

// Call the `insertPhaseAllocationsRef()` function to get a reference to the mutation.
const ref = insertPhaseAllocationsRef(insertPhaseAllocationsVars);
// Variables can be defined inline as well.
const ref = insertPhaseAllocationsRef({ allocationId: ..., createdAt: ..., hours: ..., id: ..., phaseId: ..., projectScopeId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertPhaseAllocationsRef(dataConnect, insertPhaseAllocationsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.phaseAllocations_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.phaseAllocations_insert);
});
```

## InsertProjectMonthlyRevenue
You can execute the `InsertProjectMonthlyRevenue` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertProjectMonthlyRevenue(vars: InsertProjectMonthlyRevenueVariables): MutationPromise<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;

interface InsertProjectMonthlyRevenueRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertProjectMonthlyRevenueVariables): MutationRef<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;
}
export const insertProjectMonthlyRevenueRef: InsertProjectMonthlyRevenueRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertProjectMonthlyRevenue(dc: DataConnect, vars: InsertProjectMonthlyRevenueVariables): MutationPromise<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;

interface InsertProjectMonthlyRevenueRef {
  ...
  (dc: DataConnect, vars: InsertProjectMonthlyRevenueVariables): MutationRef<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;
}
export const insertProjectMonthlyRevenueRef: InsertProjectMonthlyRevenueRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertProjectMonthlyRevenueRef:
```typescript
const name = insertProjectMonthlyRevenueRef.operationName;
console.log(name);
```

### Variables
The `InsertProjectMonthlyRevenue` mutation requires an argument of type `InsertProjectMonthlyRevenueVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertProjectMonthlyRevenueVariables {
  createdAt: DateString;
  id: UUIDString;
  monthDate: DateString;
  projectId: UUIDString;
  value: number;
}
```
### Return Type
Recall that executing the `InsertProjectMonthlyRevenue` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertProjectMonthlyRevenueData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertProjectMonthlyRevenueData {
  projectMonthlyRevenue_insert: ProjectMonthlyRevenue_Key;
}
```
### Using `InsertProjectMonthlyRevenue`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertProjectMonthlyRevenue, InsertProjectMonthlyRevenueVariables } from '@dataconnect/generated';

// The `InsertProjectMonthlyRevenue` mutation requires an argument of type `InsertProjectMonthlyRevenueVariables`:
const insertProjectMonthlyRevenueVars: InsertProjectMonthlyRevenueVariables = {
  createdAt: ..., 
  id: ..., 
  monthDate: ..., 
  projectId: ..., 
  value: ..., 
};

// Call the `insertProjectMonthlyRevenue()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertProjectMonthlyRevenue(insertProjectMonthlyRevenueVars);
// Variables can be defined inline as well.
const { data } = await insertProjectMonthlyRevenue({ createdAt: ..., id: ..., monthDate: ..., projectId: ..., value: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertProjectMonthlyRevenue(dataConnect, insertProjectMonthlyRevenueVars);

console.log(data.projectMonthlyRevenue_insert);

// Or, you can use the `Promise` API.
insertProjectMonthlyRevenue(insertProjectMonthlyRevenueVars).then((response) => {
  const data = response.data;
  console.log(data.projectMonthlyRevenue_insert);
});
```

### Using `InsertProjectMonthlyRevenue`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertProjectMonthlyRevenueRef, InsertProjectMonthlyRevenueVariables } from '@dataconnect/generated';

// The `InsertProjectMonthlyRevenue` mutation requires an argument of type `InsertProjectMonthlyRevenueVariables`:
const insertProjectMonthlyRevenueVars: InsertProjectMonthlyRevenueVariables = {
  createdAt: ..., 
  id: ..., 
  monthDate: ..., 
  projectId: ..., 
  value: ..., 
};

// Call the `insertProjectMonthlyRevenueRef()` function to get a reference to the mutation.
const ref = insertProjectMonthlyRevenueRef(insertProjectMonthlyRevenueVars);
// Variables can be defined inline as well.
const ref = insertProjectMonthlyRevenueRef({ createdAt: ..., id: ..., monthDate: ..., projectId: ..., value: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertProjectMonthlyRevenueRef(dataConnect, insertProjectMonthlyRevenueVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.projectMonthlyRevenue_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.projectMonthlyRevenue_insert);
});
```

## InsertProjectPhases
You can execute the `InsertProjectPhases` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertProjectPhases(vars: InsertProjectPhasesVariables): MutationPromise<InsertProjectPhasesData, InsertProjectPhasesVariables>;

interface InsertProjectPhasesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertProjectPhasesVariables): MutationRef<InsertProjectPhasesData, InsertProjectPhasesVariables>;
}
export const insertProjectPhasesRef: InsertProjectPhasesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertProjectPhases(dc: DataConnect, vars: InsertProjectPhasesVariables): MutationPromise<InsertProjectPhasesData, InsertProjectPhasesVariables>;

interface InsertProjectPhasesRef {
  ...
  (dc: DataConnect, vars: InsertProjectPhasesVariables): MutationRef<InsertProjectPhasesData, InsertProjectPhasesVariables>;
}
export const insertProjectPhasesRef: InsertProjectPhasesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertProjectPhasesRef:
```typescript
const name = insertProjectPhasesRef.operationName;
console.log(name);
```

### Variables
The `InsertProjectPhases` mutation requires an argument of type `InsertProjectPhasesVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `InsertProjectPhases` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertProjectPhasesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertProjectPhasesData {
  projectPhases_insert: ProjectPhases_Key;
}
```
### Using `InsertProjectPhases`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertProjectPhases, InsertProjectPhasesVariables } from '@dataconnect/generated';

// The `InsertProjectPhases` mutation requires an argument of type `InsertProjectPhasesVariables`:
const insertProjectPhasesVars: InsertProjectPhasesVariables = {
  createdAt: ..., 
  endDate: ..., // optional
  id: ..., 
  phaseName: ..., 
  projectId: ..., 
  sortOrder: ..., 
  startDate: ..., // optional
};

// Call the `insertProjectPhases()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertProjectPhases(insertProjectPhasesVars);
// Variables can be defined inline as well.
const { data } = await insertProjectPhases({ createdAt: ..., endDate: ..., id: ..., phaseName: ..., projectId: ..., sortOrder: ..., startDate: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertProjectPhases(dataConnect, insertProjectPhasesVars);

console.log(data.projectPhases_insert);

// Or, you can use the `Promise` API.
insertProjectPhases(insertProjectPhasesVars).then((response) => {
  const data = response.data;
  console.log(data.projectPhases_insert);
});
```

### Using `InsertProjectPhases`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertProjectPhasesRef, InsertProjectPhasesVariables } from '@dataconnect/generated';

// The `InsertProjectPhases` mutation requires an argument of type `InsertProjectPhasesVariables`:
const insertProjectPhasesVars: InsertProjectPhasesVariables = {
  createdAt: ..., 
  endDate: ..., // optional
  id: ..., 
  phaseName: ..., 
  projectId: ..., 
  sortOrder: ..., 
  startDate: ..., // optional
};

// Call the `insertProjectPhasesRef()` function to get a reference to the mutation.
const ref = insertProjectPhasesRef(insertProjectPhasesVars);
// Variables can be defined inline as well.
const ref = insertProjectPhasesRef({ createdAt: ..., endDate: ..., id: ..., phaseName: ..., projectId: ..., sortOrder: ..., startDate: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertProjectPhasesRef(dataConnect, insertProjectPhasesVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.projectPhases_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.projectPhases_insert);
});
```

## InsertProjectScopes
You can execute the `InsertProjectScopes` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertProjectScopes(vars: InsertProjectScopesVariables): MutationPromise<InsertProjectScopesData, InsertProjectScopesVariables>;

interface InsertProjectScopesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertProjectScopesVariables): MutationRef<InsertProjectScopesData, InsertProjectScopesVariables>;
}
export const insertProjectScopesRef: InsertProjectScopesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertProjectScopes(dc: DataConnect, vars: InsertProjectScopesVariables): MutationPromise<InsertProjectScopesData, InsertProjectScopesVariables>;

interface InsertProjectScopesRef {
  ...
  (dc: DataConnect, vars: InsertProjectScopesVariables): MutationRef<InsertProjectScopesData, InsertProjectScopesVariables>;
}
export const insertProjectScopesRef: InsertProjectScopesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertProjectScopesRef:
```typescript
const name = insertProjectScopesRef.operationName;
console.log(name);
```

### Variables
The `InsertProjectScopes` mutation requires an argument of type `InsertProjectScopesVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `InsertProjectScopes` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertProjectScopesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertProjectScopesData {
  projectScopes_insert: ProjectScopes_Key;
}
```
### Using `InsertProjectScopes`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertProjectScopes, InsertProjectScopesVariables } from '@dataconnect/generated';

// The `InsertProjectScopes` mutation requires an argument of type `InsertProjectScopesVariables`:
const insertProjectScopesVars: InsertProjectScopesVariables = {
  createdAt: ..., 
  id: ..., 
  phasePercentages: ..., // optional
  projectId: ..., // optional
  roleId: ..., // optional
  scopedHours: ..., 
};

// Call the `insertProjectScopes()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertProjectScopes(insertProjectScopesVars);
// Variables can be defined inline as well.
const { data } = await insertProjectScopes({ createdAt: ..., id: ..., phasePercentages: ..., projectId: ..., roleId: ..., scopedHours: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertProjectScopes(dataConnect, insertProjectScopesVars);

console.log(data.projectScopes_insert);

// Or, you can use the `Promise` API.
insertProjectScopes(insertProjectScopesVars).then((response) => {
  const data = response.data;
  console.log(data.projectScopes_insert);
});
```

### Using `InsertProjectScopes`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertProjectScopesRef, InsertProjectScopesVariables } from '@dataconnect/generated';

// The `InsertProjectScopes` mutation requires an argument of type `InsertProjectScopesVariables`:
const insertProjectScopesVars: InsertProjectScopesVariables = {
  createdAt: ..., 
  id: ..., 
  phasePercentages: ..., // optional
  projectId: ..., // optional
  roleId: ..., // optional
  scopedHours: ..., 
};

// Call the `insertProjectScopesRef()` function to get a reference to the mutation.
const ref = insertProjectScopesRef(insertProjectScopesVars);
// Variables can be defined inline as well.
const ref = insertProjectScopesRef({ createdAt: ..., id: ..., phasePercentages: ..., projectId: ..., roleId: ..., scopedHours: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertProjectScopesRef(dataConnect, insertProjectScopesVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.projectScopes_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.projectScopes_insert);
});
```

## InsertProjects
You can execute the `InsertProjects` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertProjects(vars: InsertProjectsVariables): MutationPromise<InsertProjectsData, InsertProjectsVariables>;

interface InsertProjectsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertProjectsVariables): MutationRef<InsertProjectsData, InsertProjectsVariables>;
}
export const insertProjectsRef: InsertProjectsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertProjects(dc: DataConnect, vars: InsertProjectsVariables): MutationPromise<InsertProjectsData, InsertProjectsVariables>;

interface InsertProjectsRef {
  ...
  (dc: DataConnect, vars: InsertProjectsVariables): MutationRef<InsertProjectsData, InsertProjectsVariables>;
}
export const insertProjectsRef: InsertProjectsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertProjectsRef:
```typescript
const name = insertProjectsRef.operationName;
console.log(name);
```

### Variables
The `InsertProjects` mutation requires an argument of type `InsertProjectsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `InsertProjects` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertProjectsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertProjectsData {
  projects_insert: Projects_Key;
}
```
### Using `InsertProjects`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertProjects, InsertProjectsVariables } from '@dataconnect/generated';

// The `InsertProjects` mutation requires an argument of type `InsertProjectsVariables`:
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

// Call the `insertProjects()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertProjects(insertProjectsVars);
// Variables can be defined inline as well.
const { data } = await insertProjects({ actualCost: ..., bdbHours: ..., budgetCost: ..., closeDate: ..., contractedInflCost: ..., createdAt: ..., createdDate: ..., dealValueDerisked: ..., durationWeeks: ..., durationWeeksRounded: ..., endDate: ..., endWeek: ..., extraData: ..., feeCalcCurrency: ..., fxLockDate: ..., fxRateGbp: ..., fxRateUsd: ..., gpCheck: ..., gpFullValue: ..., gpFullValuePerDay: ..., gpMarginPct: ..., grossBudget: ..., hardCosts: ..., hub: ..., id: ..., industry: ..., inflProductionCosts: ..., lastFeeCalcUrl: ..., leadSource: ..., mediaCost: ..., newRepeat: ..., office: ..., opportunityNumber: ..., opportunityOwner: ..., opportunityRecordType: ..., originalLeadSource: ..., paidMediaFees: ..., parentAccount: ..., phase1End: ..., phase1Name: ..., phase1Start: ..., phase2End: ..., phase2Name: ..., phase2Start: ..., phase3End: ..., phase3Name: ..., phase3Start: ..., phase4End: ..., phase4Name: ..., phase4Start: ..., price: ..., probability: ..., rateCardDiscount: ..., rateCardId: ..., revenue: ..., sfAccount: ..., stage: ..., startDate: ..., startWeek: ..., title: ..., totalFees: ..., ultimateParent: ..., updatedAt: ..., valuePerWeekPhase1: ..., valuePerWeekPhase2: ..., valuePerWeekPhase3: ..., valuePerWeekPhase4: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertProjects(dataConnect, insertProjectsVars);

console.log(data.projects_insert);

// Or, you can use the `Promise` API.
insertProjects(insertProjectsVars).then((response) => {
  const data = response.data;
  console.log(data.projects_insert);
});
```

### Using `InsertProjects`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertProjectsRef, InsertProjectsVariables } from '@dataconnect/generated';

// The `InsertProjects` mutation requires an argument of type `InsertProjectsVariables`:
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

// Call the `insertProjectsRef()` function to get a reference to the mutation.
const ref = insertProjectsRef(insertProjectsVars);
// Variables can be defined inline as well.
const ref = insertProjectsRef({ actualCost: ..., bdbHours: ..., budgetCost: ..., closeDate: ..., contractedInflCost: ..., createdAt: ..., createdDate: ..., dealValueDerisked: ..., durationWeeks: ..., durationWeeksRounded: ..., endDate: ..., endWeek: ..., extraData: ..., feeCalcCurrency: ..., fxLockDate: ..., fxRateGbp: ..., fxRateUsd: ..., gpCheck: ..., gpFullValue: ..., gpFullValuePerDay: ..., gpMarginPct: ..., grossBudget: ..., hardCosts: ..., hub: ..., id: ..., industry: ..., inflProductionCosts: ..., lastFeeCalcUrl: ..., leadSource: ..., mediaCost: ..., newRepeat: ..., office: ..., opportunityNumber: ..., opportunityOwner: ..., opportunityRecordType: ..., originalLeadSource: ..., paidMediaFees: ..., parentAccount: ..., phase1End: ..., phase1Name: ..., phase1Start: ..., phase2End: ..., phase2Name: ..., phase2Start: ..., phase3End: ..., phase3Name: ..., phase3Start: ..., phase4End: ..., phase4Name: ..., phase4Start: ..., price: ..., probability: ..., rateCardDiscount: ..., rateCardId: ..., revenue: ..., sfAccount: ..., stage: ..., startDate: ..., startWeek: ..., title: ..., totalFees: ..., ultimateParent: ..., updatedAt: ..., valuePerWeekPhase1: ..., valuePerWeekPhase2: ..., valuePerWeekPhase3: ..., valuePerWeekPhase4: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertProjectsRef(dataConnect, insertProjectsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.projects_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.projects_insert);
});
```

## InsertRateCards
You can execute the `InsertRateCards` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertRateCards(vars: InsertRateCardsVariables): MutationPromise<InsertRateCardsData, InsertRateCardsVariables>;

interface InsertRateCardsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertRateCardsVariables): MutationRef<InsertRateCardsData, InsertRateCardsVariables>;
}
export const insertRateCardsRef: InsertRateCardsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertRateCards(dc: DataConnect, vars: InsertRateCardsVariables): MutationPromise<InsertRateCardsData, InsertRateCardsVariables>;

interface InsertRateCardsRef {
  ...
  (dc: DataConnect, vars: InsertRateCardsVariables): MutationRef<InsertRateCardsData, InsertRateCardsVariables>;
}
export const insertRateCardsRef: InsertRateCardsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertRateCardsRef:
```typescript
const name = insertRateCardsRef.operationName;
console.log(name);
```

### Variables
The `InsertRateCards` mutation requires an argument of type `InsertRateCardsVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `InsertRateCards` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertRateCardsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertRateCardsData {
  rateCards_insert: RateCards_Key;
}
```
### Using `InsertRateCards`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertRateCards, InsertRateCardsVariables } from '@dataconnect/generated';

// The `InsertRateCards` mutation requires an argument of type `InsertRateCardsVariables`:
const insertRateCardsVars: InsertRateCardsVariables = {
  createdAt: ..., 
  currency: ..., 
  hourlyRate: ..., 
  id: ..., 
  name: ..., 
  roleId: ..., // optional
};

// Call the `insertRateCards()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertRateCards(insertRateCardsVars);
// Variables can be defined inline as well.
const { data } = await insertRateCards({ createdAt: ..., currency: ..., hourlyRate: ..., id: ..., name: ..., roleId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertRateCards(dataConnect, insertRateCardsVars);

console.log(data.rateCards_insert);

// Or, you can use the `Promise` API.
insertRateCards(insertRateCardsVars).then((response) => {
  const data = response.data;
  console.log(data.rateCards_insert);
});
```

### Using `InsertRateCards`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertRateCardsRef, InsertRateCardsVariables } from '@dataconnect/generated';

// The `InsertRateCards` mutation requires an argument of type `InsertRateCardsVariables`:
const insertRateCardsVars: InsertRateCardsVariables = {
  createdAt: ..., 
  currency: ..., 
  hourlyRate: ..., 
  id: ..., 
  name: ..., 
  roleId: ..., // optional
};

// Call the `insertRateCardsRef()` function to get a reference to the mutation.
const ref = insertRateCardsRef(insertRateCardsVars);
// Variables can be defined inline as well.
const ref = insertRateCardsRef({ createdAt: ..., currency: ..., hourlyRate: ..., id: ..., name: ..., roleId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertRateCardsRef(dataConnect, insertRateCardsVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.rateCards_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.rateCards_insert);
});
```

## InsertRoles
You can execute the `InsertRoles` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertRoles(vars: InsertRolesVariables): MutationPromise<InsertRolesData, InsertRolesVariables>;

interface InsertRolesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertRolesVariables): MutationRef<InsertRolesData, InsertRolesVariables>;
}
export const insertRolesRef: InsertRolesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertRoles(dc: DataConnect, vars: InsertRolesVariables): MutationPromise<InsertRolesData, InsertRolesVariables>;

interface InsertRolesRef {
  ...
  (dc: DataConnect, vars: InsertRolesVariables): MutationRef<InsertRolesData, InsertRolesVariables>;
}
export const insertRolesRef: InsertRolesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertRolesRef:
```typescript
const name = insertRolesRef.operationName;
console.log(name);
```

### Variables
The `InsertRoles` mutation requires an argument of type `InsertRolesVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface InsertRolesVariables {
  billableCapacityHours: number;
  createdAt: DateString;
  id: UUIDString;
  name: string;
}
```
### Return Type
Recall that executing the `InsertRoles` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertRolesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertRolesData {
  roles_insert: Roles_Key;
}
```
### Using `InsertRoles`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertRoles, InsertRolesVariables } from '@dataconnect/generated';

// The `InsertRoles` mutation requires an argument of type `InsertRolesVariables`:
const insertRolesVars: InsertRolesVariables = {
  billableCapacityHours: ..., 
  createdAt: ..., 
  id: ..., 
  name: ..., 
};

// Call the `insertRoles()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertRoles(insertRolesVars);
// Variables can be defined inline as well.
const { data } = await insertRoles({ billableCapacityHours: ..., createdAt: ..., id: ..., name: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertRoles(dataConnect, insertRolesVars);

console.log(data.roles_insert);

// Or, you can use the `Promise` API.
insertRoles(insertRolesVars).then((response) => {
  const data = response.data;
  console.log(data.roles_insert);
});
```

### Using `InsertRoles`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertRolesRef, InsertRolesVariables } from '@dataconnect/generated';

// The `InsertRoles` mutation requires an argument of type `InsertRolesVariables`:
const insertRolesVars: InsertRolesVariables = {
  billableCapacityHours: ..., 
  createdAt: ..., 
  id: ..., 
  name: ..., 
};

// Call the `insertRolesRef()` function to get a reference to the mutation.
const ref = insertRolesRef(insertRolesVars);
// Variables can be defined inline as well.
const ref = insertRolesRef({ billableCapacityHours: ..., createdAt: ..., id: ..., name: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertRolesRef(dataConnect, insertRolesVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.roles_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.roles_insert);
});
```

## InsertTimeEntries
You can execute the `InsertTimeEntries` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
insertTimeEntries(vars: InsertTimeEntriesVariables): MutationPromise<InsertTimeEntriesData, InsertTimeEntriesVariables>;

interface InsertTimeEntriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertTimeEntriesVariables): MutationRef<InsertTimeEntriesData, InsertTimeEntriesVariables>;
}
export const insertTimeEntriesRef: InsertTimeEntriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
insertTimeEntries(dc: DataConnect, vars: InsertTimeEntriesVariables): MutationPromise<InsertTimeEntriesData, InsertTimeEntriesVariables>;

interface InsertTimeEntriesRef {
  ...
  (dc: DataConnect, vars: InsertTimeEntriesVariables): MutationRef<InsertTimeEntriesData, InsertTimeEntriesVariables>;
}
export const insertTimeEntriesRef: InsertTimeEntriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the insertTimeEntriesRef:
```typescript
const name = insertTimeEntriesRef.operationName;
console.log(name);
```

### Variables
The `InsertTimeEntries` mutation requires an argument of type `InsertTimeEntriesVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
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
Recall that executing the `InsertTimeEntries` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `InsertTimeEntriesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface InsertTimeEntriesData {
  timeEntries_insert: TimeEntries_Key;
}
```
### Using `InsertTimeEntries`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, insertTimeEntries, InsertTimeEntriesVariables } from '@dataconnect/generated';

// The `InsertTimeEntries` mutation requires an argument of type `InsertTimeEntriesVariables`:
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

// Call the `insertTimeEntries()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await insertTimeEntries(insertTimeEntriesVars);
// Variables can be defined inline as well.
const { data } = await insertTimeEntries({ createdAt: ..., date: ..., hours: ..., id: ..., notes: ..., personId: ..., personName: ..., projectCode: ..., projectId: ..., projectName: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await insertTimeEntries(dataConnect, insertTimeEntriesVars);

console.log(data.timeEntries_insert);

// Or, you can use the `Promise` API.
insertTimeEntries(insertTimeEntriesVars).then((response) => {
  const data = response.data;
  console.log(data.timeEntries_insert);
});
```

### Using `InsertTimeEntries`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, insertTimeEntriesRef, InsertTimeEntriesVariables } from '@dataconnect/generated';

// The `InsertTimeEntries` mutation requires an argument of type `InsertTimeEntriesVariables`:
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

// Call the `insertTimeEntriesRef()` function to get a reference to the mutation.
const ref = insertTimeEntriesRef(insertTimeEntriesVars);
// Variables can be defined inline as well.
const ref = insertTimeEntriesRef({ createdAt: ..., date: ..., hours: ..., id: ..., notes: ..., personId: ..., personName: ..., projectCode: ..., projectId: ..., projectName: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = insertTimeEntriesRef(dataConnect, insertTimeEntriesVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.timeEntries_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.timeEntries_insert);
});
```

## CreateAppUser
You can execute the `CreateAppUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createAppUser(vars: CreateAppUserVariables): MutationPromise<CreateAppUserData, CreateAppUserVariables>;

interface CreateAppUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAppUserVariables): MutationRef<CreateAppUserData, CreateAppUserVariables>;
}
export const createAppUserRef: CreateAppUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAppUser(dc: DataConnect, vars: CreateAppUserVariables): MutationPromise<CreateAppUserData, CreateAppUserVariables>;

interface CreateAppUserRef {
  ...
  (dc: DataConnect, vars: CreateAppUserVariables): MutationRef<CreateAppUserData, CreateAppUserVariables>;
}
export const createAppUserRef: CreateAppUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAppUserRef:
```typescript
const name = createAppUserRef.operationName;
console.log(name);
```

### Variables
The `CreateAppUser` mutation requires an argument of type `CreateAppUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAppUserVariables {
  email: string;
  role: string;
  addedBy?: string | null;
}
```
### Return Type
Recall that executing the `CreateAppUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAppUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAppUserData {
  appUsers_insert: AppUsers_Key;
}
```
### Using `CreateAppUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAppUser, CreateAppUserVariables } from '@dataconnect/generated';

// The `CreateAppUser` mutation requires an argument of type `CreateAppUserVariables`:
const createAppUserVars: CreateAppUserVariables = {
  email: ..., 
  role: ..., 
  addedBy: ..., // optional
};

// Call the `createAppUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAppUser(createAppUserVars);
// Variables can be defined inline as well.
const { data } = await createAppUser({ email: ..., role: ..., addedBy: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAppUser(dataConnect, createAppUserVars);

console.log(data.appUsers_insert);

// Or, you can use the `Promise` API.
createAppUser(createAppUserVars).then((response) => {
  const data = response.data;
  console.log(data.appUsers_insert);
});
```

### Using `CreateAppUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAppUserRef, CreateAppUserVariables } from '@dataconnect/generated';

// The `CreateAppUser` mutation requires an argument of type `CreateAppUserVariables`:
const createAppUserVars: CreateAppUserVariables = {
  email: ..., 
  role: ..., 
  addedBy: ..., // optional
};

// Call the `createAppUserRef()` function to get a reference to the mutation.
const ref = createAppUserRef(createAppUserVars);
// Variables can be defined inline as well.
const ref = createAppUserRef({ email: ..., role: ..., addedBy: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAppUserRef(dataConnect, createAppUserVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.appUsers_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.appUsers_insert);
});
```

## UpdateAppUser
You can execute the `UpdateAppUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateAppUser(vars: UpdateAppUserVariables): MutationPromise<UpdateAppUserData, UpdateAppUserVariables>;

interface UpdateAppUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateAppUserVariables): MutationRef<UpdateAppUserData, UpdateAppUserVariables>;
}
export const updateAppUserRef: UpdateAppUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateAppUser(dc: DataConnect, vars: UpdateAppUserVariables): MutationPromise<UpdateAppUserData, UpdateAppUserVariables>;

interface UpdateAppUserRef {
  ...
  (dc: DataConnect, vars: UpdateAppUserVariables): MutationRef<UpdateAppUserData, UpdateAppUserVariables>;
}
export const updateAppUserRef: UpdateAppUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateAppUserRef:
```typescript
const name = updateAppUserRef.operationName;
console.log(name);
```

### Variables
The `UpdateAppUser` mutation requires an argument of type `UpdateAppUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface UpdateAppUserVariables {
  id: UUIDString;
  role: string;
}
```
### Return Type
Recall that executing the `UpdateAppUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateAppUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface UpdateAppUserData {
  appUsers_update?: AppUsers_Key | null;
}
```
### Using `UpdateAppUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateAppUser, UpdateAppUserVariables } from '@dataconnect/generated';

// The `UpdateAppUser` mutation requires an argument of type `UpdateAppUserVariables`:
const updateAppUserVars: UpdateAppUserVariables = {
  id: ..., 
  role: ..., 
};

// Call the `updateAppUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateAppUser(updateAppUserVars);
// Variables can be defined inline as well.
const { data } = await updateAppUser({ id: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateAppUser(dataConnect, updateAppUserVars);

console.log(data.appUsers_update);

// Or, you can use the `Promise` API.
updateAppUser(updateAppUserVars).then((response) => {
  const data = response.data;
  console.log(data.appUsers_update);
});
```

### Using `UpdateAppUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateAppUserRef, UpdateAppUserVariables } from '@dataconnect/generated';

// The `UpdateAppUser` mutation requires an argument of type `UpdateAppUserVariables`:
const updateAppUserVars: UpdateAppUserVariables = {
  id: ..., 
  role: ..., 
};

// Call the `updateAppUserRef()` function to get a reference to the mutation.
const ref = updateAppUserRef(updateAppUserVars);
// Variables can be defined inline as well.
const ref = updateAppUserRef({ id: ..., role: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateAppUserRef(dataConnect, updateAppUserVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.appUsers_update);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.appUsers_update);
});
```

## DeleteAppUser
You can execute the `DeleteAppUser` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
deleteAppUser(vars: DeleteAppUserVariables): MutationPromise<DeleteAppUserData, DeleteAppUserVariables>;

interface DeleteAppUserRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteAppUserVariables): MutationRef<DeleteAppUserData, DeleteAppUserVariables>;
}
export const deleteAppUserRef: DeleteAppUserRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
deleteAppUser(dc: DataConnect, vars: DeleteAppUserVariables): MutationPromise<DeleteAppUserData, DeleteAppUserVariables>;

interface DeleteAppUserRef {
  ...
  (dc: DataConnect, vars: DeleteAppUserVariables): MutationRef<DeleteAppUserData, DeleteAppUserVariables>;
}
export const deleteAppUserRef: DeleteAppUserRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the deleteAppUserRef:
```typescript
const name = deleteAppUserRef.operationName;
console.log(name);
```

### Variables
The `DeleteAppUser` mutation requires an argument of type `DeleteAppUserVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface DeleteAppUserVariables {
  id: UUIDString;
}
```
### Return Type
Recall that executing the `DeleteAppUser` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `DeleteAppUserData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface DeleteAppUserData {
  appUsers_delete?: AppUsers_Key | null;
}
```
### Using `DeleteAppUser`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, deleteAppUser, DeleteAppUserVariables } from '@dataconnect/generated';

// The `DeleteAppUser` mutation requires an argument of type `DeleteAppUserVariables`:
const deleteAppUserVars: DeleteAppUserVariables = {
  id: ..., 
};

// Call the `deleteAppUser()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await deleteAppUser(deleteAppUserVars);
// Variables can be defined inline as well.
const { data } = await deleteAppUser({ id: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await deleteAppUser(dataConnect, deleteAppUserVars);

console.log(data.appUsers_delete);

// Or, you can use the `Promise` API.
deleteAppUser(deleteAppUserVars).then((response) => {
  const data = response.data;
  console.log(data.appUsers_delete);
});
```

### Using `DeleteAppUser`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, deleteAppUserRef, DeleteAppUserVariables } from '@dataconnect/generated';

// The `DeleteAppUser` mutation requires an argument of type `DeleteAppUserVariables`:
const deleteAppUserVars: DeleteAppUserVariables = {
  id: ..., 
};

// Call the `deleteAppUserRef()` function to get a reference to the mutation.
const ref = deleteAppUserRef(deleteAppUserVars);
// Variables can be defined inline as well.
const ref = deleteAppUserRef({ id: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = deleteAppUserRef(dataConnect, deleteAppUserVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.appUsers_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.appUsers_delete);
});
```

