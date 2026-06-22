# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useListProjects, useGetProject, useListPeople, useListRoles, useListRateCards, useListTimeEntries, useListTimeEntriesByProject, useListProjectPhases, useListAllocations, useListDataImports } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useListProjects();

const { data, isPending, isSuccess, isError, error } = useGetProject(getProjectVars);

const { data, isPending, isSuccess, isError, error } = useListPeople();

const { data, isPending, isSuccess, isError, error } = useListRoles();

const { data, isPending, isSuccess, isError, error } = useListRateCards();

const { data, isPending, isSuccess, isError, error } = useListTimeEntries();

const { data, isPending, isSuccess, isError, error } = useListTimeEntriesByProject(listTimeEntriesByProjectVars);

const { data, isPending, isSuccess, isError, error } = useListProjectPhases();

const { data, isPending, isSuccess, isError, error } = useListAllocations();

const { data, isPending, isSuccess, isError, error } = useListDataImports();

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listProjects, getProject, listPeople, listRoles, listRateCards, listTimeEntries, listTimeEntriesByProject, listProjectPhases, listAllocations, listDataImports } from '@dataconnect/generated';


// Operation ListProjects: 
const { data } = await ListProjects(dataConnect);

// Operation GetProject:  For variables, look at type GetProjectVars in ../index.d.ts
const { data } = await GetProject(dataConnect, getProjectVars);

// Operation ListPeople: 
const { data } = await ListPeople(dataConnect);

// Operation ListRoles: 
const { data } = await ListRoles(dataConnect);

// Operation ListRateCards: 
const { data } = await ListRateCards(dataConnect);

// Operation ListTimeEntries: 
const { data } = await ListTimeEntries(dataConnect);

// Operation ListTimeEntriesByProject:  For variables, look at type ListTimeEntriesByProjectVars in ../index.d.ts
const { data } = await ListTimeEntriesByProject(dataConnect, listTimeEntriesByProjectVars);

// Operation ListProjectPhases: 
const { data } = await ListProjectPhases(dataConnect);

// Operation ListAllocations: 
const { data } = await ListAllocations(dataConnect);

// Operation ListDataImports: 
const { data } = await ListDataImports(dataConnect);


```