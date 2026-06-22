# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.





## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listProjects, getProject, listPeople, listRoles, listRateCards, listTimeEntries, listTimeEntriesByProject, listProjectPhases, listAllocations, listDataImports } from '@dataconnect/generated-server';


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