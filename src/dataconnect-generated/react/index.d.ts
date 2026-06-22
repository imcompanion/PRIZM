import { ListProjectsData, GetProjectData, GetProjectVariables, ListPeopleData, ListRolesData, ListRateCardsData, ListTimeEntriesData, ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables, ListProjectPhasesData, ListAllocationsData, ListDataImportsData, GetAppUserByEmailData, GetAppUserByEmailVariables, ListAppUsersData, InsertAllocationsData, InsertAllocationsVariables, InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables, InsertBillabilityRulesData, InsertBillabilityRulesVariables, InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables, InsertDailyAllocationsData, InsertDailyAllocationsVariables, InsertDataImportsData, InsertDataImportsVariables, InsertPeopleData, InsertPeopleVariables, InsertPhaseAllocationsData, InsertPhaseAllocationsVariables, InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables, InsertProjectPhasesData, InsertProjectPhasesVariables, InsertProjectScopesData, InsertProjectScopesVariables, InsertProjectsData, InsertProjectsVariables, InsertRateCardsData, InsertRateCardsVariables, InsertRolesData, InsertRolesVariables, InsertTimeEntriesData, InsertTimeEntriesVariables, CreateAppUserData, CreateAppUserVariables, UpdateAppUserData, UpdateAppUserVariables, DeleteAppUserData, DeleteAppUserVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListProjects(options?: useDataConnectQueryOptions<ListProjectsData>): UseDataConnectQueryResult<ListProjectsData, undefined>;
export function useListProjects(dc: DataConnect, options?: useDataConnectQueryOptions<ListProjectsData>): UseDataConnectQueryResult<ListProjectsData, undefined>;

export function useGetProject(vars: GetProjectVariables, options?: useDataConnectQueryOptions<GetProjectData>): UseDataConnectQueryResult<GetProjectData, GetProjectVariables>;
export function useGetProject(dc: DataConnect, vars: GetProjectVariables, options?: useDataConnectQueryOptions<GetProjectData>): UseDataConnectQueryResult<GetProjectData, GetProjectVariables>;

export function useListPeople(options?: useDataConnectQueryOptions<ListPeopleData>): UseDataConnectQueryResult<ListPeopleData, undefined>;
export function useListPeople(dc: DataConnect, options?: useDataConnectQueryOptions<ListPeopleData>): UseDataConnectQueryResult<ListPeopleData, undefined>;

export function useListRoles(options?: useDataConnectQueryOptions<ListRolesData>): UseDataConnectQueryResult<ListRolesData, undefined>;
export function useListRoles(dc: DataConnect, options?: useDataConnectQueryOptions<ListRolesData>): UseDataConnectQueryResult<ListRolesData, undefined>;

export function useListRateCards(options?: useDataConnectQueryOptions<ListRateCardsData>): UseDataConnectQueryResult<ListRateCardsData, undefined>;
export function useListRateCards(dc: DataConnect, options?: useDataConnectQueryOptions<ListRateCardsData>): UseDataConnectQueryResult<ListRateCardsData, undefined>;

export function useListTimeEntries(options?: useDataConnectQueryOptions<ListTimeEntriesData>): UseDataConnectQueryResult<ListTimeEntriesData, undefined>;
export function useListTimeEntries(dc: DataConnect, options?: useDataConnectQueryOptions<ListTimeEntriesData>): UseDataConnectQueryResult<ListTimeEntriesData, undefined>;

export function useListTimeEntriesByProject(vars: ListTimeEntriesByProjectVariables, options?: useDataConnectQueryOptions<ListTimeEntriesByProjectData>): UseDataConnectQueryResult<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;
export function useListTimeEntriesByProject(dc: DataConnect, vars: ListTimeEntriesByProjectVariables, options?: useDataConnectQueryOptions<ListTimeEntriesByProjectData>): UseDataConnectQueryResult<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;

export function useListProjectPhases(options?: useDataConnectQueryOptions<ListProjectPhasesData>): UseDataConnectQueryResult<ListProjectPhasesData, undefined>;
export function useListProjectPhases(dc: DataConnect, options?: useDataConnectQueryOptions<ListProjectPhasesData>): UseDataConnectQueryResult<ListProjectPhasesData, undefined>;

export function useListAllocations(options?: useDataConnectQueryOptions<ListAllocationsData>): UseDataConnectQueryResult<ListAllocationsData, undefined>;
export function useListAllocations(dc: DataConnect, options?: useDataConnectQueryOptions<ListAllocationsData>): UseDataConnectQueryResult<ListAllocationsData, undefined>;

export function useListDataImports(options?: useDataConnectQueryOptions<ListDataImportsData>): UseDataConnectQueryResult<ListDataImportsData, undefined>;
export function useListDataImports(dc: DataConnect, options?: useDataConnectQueryOptions<ListDataImportsData>): UseDataConnectQueryResult<ListDataImportsData, undefined>;

export function useGetAppUserByEmail(vars: GetAppUserByEmailVariables, options?: useDataConnectQueryOptions<GetAppUserByEmailData>): UseDataConnectQueryResult<GetAppUserByEmailData, GetAppUserByEmailVariables>;
export function useGetAppUserByEmail(dc: DataConnect, vars: GetAppUserByEmailVariables, options?: useDataConnectQueryOptions<GetAppUserByEmailData>): UseDataConnectQueryResult<GetAppUserByEmailData, GetAppUserByEmailVariables>;

export function useListAppUsers(options?: useDataConnectQueryOptions<ListAppUsersData>): UseDataConnectQueryResult<ListAppUsersData, undefined>;
export function useListAppUsers(dc: DataConnect, options?: useDataConnectQueryOptions<ListAppUsersData>): UseDataConnectQueryResult<ListAppUsersData, undefined>;

export function useInsertAllocations(options?: useDataConnectMutationOptions<InsertAllocationsData, FirebaseError, InsertAllocationsVariables>): UseDataConnectMutationResult<InsertAllocationsData, InsertAllocationsVariables>;
export function useInsertAllocations(dc: DataConnect, options?: useDataConnectMutationOptions<InsertAllocationsData, FirebaseError, InsertAllocationsVariables>): UseDataConnectMutationResult<InsertAllocationsData, InsertAllocationsVariables>;

export function useInsertBillabilityRuleConditions(options?: useDataConnectMutationOptions<InsertBillabilityRuleConditionsData, FirebaseError, InsertBillabilityRuleConditionsVariables>): UseDataConnectMutationResult<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;
export function useInsertBillabilityRuleConditions(dc: DataConnect, options?: useDataConnectMutationOptions<InsertBillabilityRuleConditionsData, FirebaseError, InsertBillabilityRuleConditionsVariables>): UseDataConnectMutationResult<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;

export function useInsertBillabilityRules(options?: useDataConnectMutationOptions<InsertBillabilityRulesData, FirebaseError, InsertBillabilityRulesVariables>): UseDataConnectMutationResult<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;
export function useInsertBillabilityRules(dc: DataConnect, options?: useDataConnectMutationOptions<InsertBillabilityRulesData, FirebaseError, InsertBillabilityRulesVariables>): UseDataConnectMutationResult<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;

export function useInsertClientTeamAllocations(options?: useDataConnectMutationOptions<InsertClientTeamAllocationsData, FirebaseError, InsertClientTeamAllocationsVariables>): UseDataConnectMutationResult<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;
export function useInsertClientTeamAllocations(dc: DataConnect, options?: useDataConnectMutationOptions<InsertClientTeamAllocationsData, FirebaseError, InsertClientTeamAllocationsVariables>): UseDataConnectMutationResult<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;

export function useInsertDailyAllocations(options?: useDataConnectMutationOptions<InsertDailyAllocationsData, FirebaseError, InsertDailyAllocationsVariables>): UseDataConnectMutationResult<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;
export function useInsertDailyAllocations(dc: DataConnect, options?: useDataConnectMutationOptions<InsertDailyAllocationsData, FirebaseError, InsertDailyAllocationsVariables>): UseDataConnectMutationResult<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;

export function useInsertDataImports(options?: useDataConnectMutationOptions<InsertDataImportsData, FirebaseError, InsertDataImportsVariables>): UseDataConnectMutationResult<InsertDataImportsData, InsertDataImportsVariables>;
export function useInsertDataImports(dc: DataConnect, options?: useDataConnectMutationOptions<InsertDataImportsData, FirebaseError, InsertDataImportsVariables>): UseDataConnectMutationResult<InsertDataImportsData, InsertDataImportsVariables>;

export function useInsertPeople(options?: useDataConnectMutationOptions<InsertPeopleData, FirebaseError, InsertPeopleVariables>): UseDataConnectMutationResult<InsertPeopleData, InsertPeopleVariables>;
export function useInsertPeople(dc: DataConnect, options?: useDataConnectMutationOptions<InsertPeopleData, FirebaseError, InsertPeopleVariables>): UseDataConnectMutationResult<InsertPeopleData, InsertPeopleVariables>;

export function useInsertPhaseAllocations(options?: useDataConnectMutationOptions<InsertPhaseAllocationsData, FirebaseError, InsertPhaseAllocationsVariables>): UseDataConnectMutationResult<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;
export function useInsertPhaseAllocations(dc: DataConnect, options?: useDataConnectMutationOptions<InsertPhaseAllocationsData, FirebaseError, InsertPhaseAllocationsVariables>): UseDataConnectMutationResult<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;

export function useInsertProjectMonthlyRevenue(options?: useDataConnectMutationOptions<InsertProjectMonthlyRevenueData, FirebaseError, InsertProjectMonthlyRevenueVariables>): UseDataConnectMutationResult<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;
export function useInsertProjectMonthlyRevenue(dc: DataConnect, options?: useDataConnectMutationOptions<InsertProjectMonthlyRevenueData, FirebaseError, InsertProjectMonthlyRevenueVariables>): UseDataConnectMutationResult<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;

export function useInsertProjectPhases(options?: useDataConnectMutationOptions<InsertProjectPhasesData, FirebaseError, InsertProjectPhasesVariables>): UseDataConnectMutationResult<InsertProjectPhasesData, InsertProjectPhasesVariables>;
export function useInsertProjectPhases(dc: DataConnect, options?: useDataConnectMutationOptions<InsertProjectPhasesData, FirebaseError, InsertProjectPhasesVariables>): UseDataConnectMutationResult<InsertProjectPhasesData, InsertProjectPhasesVariables>;

export function useInsertProjectScopes(options?: useDataConnectMutationOptions<InsertProjectScopesData, FirebaseError, InsertProjectScopesVariables>): UseDataConnectMutationResult<InsertProjectScopesData, InsertProjectScopesVariables>;
export function useInsertProjectScopes(dc: DataConnect, options?: useDataConnectMutationOptions<InsertProjectScopesData, FirebaseError, InsertProjectScopesVariables>): UseDataConnectMutationResult<InsertProjectScopesData, InsertProjectScopesVariables>;

export function useInsertProjects(options?: useDataConnectMutationOptions<InsertProjectsData, FirebaseError, InsertProjectsVariables>): UseDataConnectMutationResult<InsertProjectsData, InsertProjectsVariables>;
export function useInsertProjects(dc: DataConnect, options?: useDataConnectMutationOptions<InsertProjectsData, FirebaseError, InsertProjectsVariables>): UseDataConnectMutationResult<InsertProjectsData, InsertProjectsVariables>;

export function useInsertRateCards(options?: useDataConnectMutationOptions<InsertRateCardsData, FirebaseError, InsertRateCardsVariables>): UseDataConnectMutationResult<InsertRateCardsData, InsertRateCardsVariables>;
export function useInsertRateCards(dc: DataConnect, options?: useDataConnectMutationOptions<InsertRateCardsData, FirebaseError, InsertRateCardsVariables>): UseDataConnectMutationResult<InsertRateCardsData, InsertRateCardsVariables>;

export function useInsertRoles(options?: useDataConnectMutationOptions<InsertRolesData, FirebaseError, InsertRolesVariables>): UseDataConnectMutationResult<InsertRolesData, InsertRolesVariables>;
export function useInsertRoles(dc: DataConnect, options?: useDataConnectMutationOptions<InsertRolesData, FirebaseError, InsertRolesVariables>): UseDataConnectMutationResult<InsertRolesData, InsertRolesVariables>;

export function useInsertTimeEntries(options?: useDataConnectMutationOptions<InsertTimeEntriesData, FirebaseError, InsertTimeEntriesVariables>): UseDataConnectMutationResult<InsertTimeEntriesData, InsertTimeEntriesVariables>;
export function useInsertTimeEntries(dc: DataConnect, options?: useDataConnectMutationOptions<InsertTimeEntriesData, FirebaseError, InsertTimeEntriesVariables>): UseDataConnectMutationResult<InsertTimeEntriesData, InsertTimeEntriesVariables>;

export function useCreateAppUser(options?: useDataConnectMutationOptions<CreateAppUserData, FirebaseError, CreateAppUserVariables>): UseDataConnectMutationResult<CreateAppUserData, CreateAppUserVariables>;
export function useCreateAppUser(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAppUserData, FirebaseError, CreateAppUserVariables>): UseDataConnectMutationResult<CreateAppUserData, CreateAppUserVariables>;

export function useUpdateAppUser(options?: useDataConnectMutationOptions<UpdateAppUserData, FirebaseError, UpdateAppUserVariables>): UseDataConnectMutationResult<UpdateAppUserData, UpdateAppUserVariables>;
export function useUpdateAppUser(dc: DataConnect, options?: useDataConnectMutationOptions<UpdateAppUserData, FirebaseError, UpdateAppUserVariables>): UseDataConnectMutationResult<UpdateAppUserData, UpdateAppUserVariables>;

export function useDeleteAppUser(options?: useDataConnectMutationOptions<DeleteAppUserData, FirebaseError, DeleteAppUserVariables>): UseDataConnectMutationResult<DeleteAppUserData, DeleteAppUserVariables>;
export function useDeleteAppUser(dc: DataConnect, options?: useDataConnectMutationOptions<DeleteAppUserData, FirebaseError, DeleteAppUserVariables>): UseDataConnectMutationResult<DeleteAppUserData, DeleteAppUserVariables>;
