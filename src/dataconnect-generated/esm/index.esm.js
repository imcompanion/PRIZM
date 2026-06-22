import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'example',
  service: 'projectzen',
  location: 'us-east4'
};

export const listProjectsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProjects');
}
listProjectsRef.operationName = 'ListProjects';

export function listProjects(dc) {
  return executeQuery(listProjectsRef(dc));
}

export const getProjectRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetProject', inputVars);
}
getProjectRef.operationName = 'GetProject';

export function getProject(dcOrVars, vars) {
  return executeQuery(getProjectRef(dcOrVars, vars));
}

export const listPeopleRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPeople');
}
listPeopleRef.operationName = 'ListPeople';

export function listPeople(dc) {
  return executeQuery(listPeopleRef(dc));
}

export const listRolesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListRoles');
}
listRolesRef.operationName = 'ListRoles';

export function listRoles(dc) {
  return executeQuery(listRolesRef(dc));
}

export const listRateCardsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListRateCards');
}
listRateCardsRef.operationName = 'ListRateCards';

export function listRateCards(dc) {
  return executeQuery(listRateCardsRef(dc));
}

export const listTimeEntriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTimeEntries');
}
listTimeEntriesRef.operationName = 'ListTimeEntries';

export function listTimeEntries(dc) {
  return executeQuery(listTimeEntriesRef(dc));
}

export const listTimeEntriesByProjectRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTimeEntriesByProject', inputVars);
}
listTimeEntriesByProjectRef.operationName = 'ListTimeEntriesByProject';

export function listTimeEntriesByProject(dcOrVars, vars) {
  return executeQuery(listTimeEntriesByProjectRef(dcOrVars, vars));
}

export const listProjectPhasesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProjectPhases');
}
listProjectPhasesRef.operationName = 'ListProjectPhases';

export function listProjectPhases(dc) {
  return executeQuery(listProjectPhasesRef(dc));
}

export const listAllocationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllocations');
}
listAllocationsRef.operationName = 'ListAllocations';

export function listAllocations(dc) {
  return executeQuery(listAllocationsRef(dc));
}

export const listDataImportsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDataImports');
}
listDataImportsRef.operationName = 'ListDataImports';

export function listDataImports(dc) {
  return executeQuery(listDataImportsRef(dc));
}

export const getAppUserByEmailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAppUserByEmail', inputVars);
}
getAppUserByEmailRef.operationName = 'GetAppUserByEmail';

export function getAppUserByEmail(dcOrVars, vars) {
  return executeQuery(getAppUserByEmailRef(dcOrVars, vars));
}

export const listAppUsersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAppUsers');
}
listAppUsersRef.operationName = 'ListAppUsers';

export function listAppUsers(dc) {
  return executeQuery(listAppUsersRef(dc));
}

export const insertAllocationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertAllocations', inputVars);
}
insertAllocationsRef.operationName = 'InsertAllocations';

export function insertAllocations(dcOrVars, vars) {
  return executeMutation(insertAllocationsRef(dcOrVars, vars));
}

export const insertBillabilityRuleConditionsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertBillabilityRuleConditions', inputVars);
}
insertBillabilityRuleConditionsRef.operationName = 'InsertBillabilityRuleConditions';

export function insertBillabilityRuleConditions(dcOrVars, vars) {
  return executeMutation(insertBillabilityRuleConditionsRef(dcOrVars, vars));
}

export const insertBillabilityRulesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertBillabilityRules', inputVars);
}
insertBillabilityRulesRef.operationName = 'InsertBillabilityRules';

export function insertBillabilityRules(dcOrVars, vars) {
  return executeMutation(insertBillabilityRulesRef(dcOrVars, vars));
}

export const insertClientTeamAllocationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertClientTeamAllocations', inputVars);
}
insertClientTeamAllocationsRef.operationName = 'InsertClientTeamAllocations';

export function insertClientTeamAllocations(dcOrVars, vars) {
  return executeMutation(insertClientTeamAllocationsRef(dcOrVars, vars));
}

export const insertDailyAllocationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertDailyAllocations', inputVars);
}
insertDailyAllocationsRef.operationName = 'InsertDailyAllocations';

export function insertDailyAllocations(dcOrVars, vars) {
  return executeMutation(insertDailyAllocationsRef(dcOrVars, vars));
}

export const insertDataImportsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertDataImports', inputVars);
}
insertDataImportsRef.operationName = 'InsertDataImports';

export function insertDataImports(dcOrVars, vars) {
  return executeMutation(insertDataImportsRef(dcOrVars, vars));
}

export const insertPeopleRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertPeople', inputVars);
}
insertPeopleRef.operationName = 'InsertPeople';

export function insertPeople(dcOrVars, vars) {
  return executeMutation(insertPeopleRef(dcOrVars, vars));
}

export const insertPhaseAllocationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertPhaseAllocations', inputVars);
}
insertPhaseAllocationsRef.operationName = 'InsertPhaseAllocations';

export function insertPhaseAllocations(dcOrVars, vars) {
  return executeMutation(insertPhaseAllocationsRef(dcOrVars, vars));
}

export const insertProjectMonthlyRevenueRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertProjectMonthlyRevenue', inputVars);
}
insertProjectMonthlyRevenueRef.operationName = 'InsertProjectMonthlyRevenue';

export function insertProjectMonthlyRevenue(dcOrVars, vars) {
  return executeMutation(insertProjectMonthlyRevenueRef(dcOrVars, vars));
}

export const insertProjectPhasesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertProjectPhases', inputVars);
}
insertProjectPhasesRef.operationName = 'InsertProjectPhases';

export function insertProjectPhases(dcOrVars, vars) {
  return executeMutation(insertProjectPhasesRef(dcOrVars, vars));
}

export const insertProjectScopesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertProjectScopes', inputVars);
}
insertProjectScopesRef.operationName = 'InsertProjectScopes';

export function insertProjectScopes(dcOrVars, vars) {
  return executeMutation(insertProjectScopesRef(dcOrVars, vars));
}

export const insertProjectsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertProjects', inputVars);
}
insertProjectsRef.operationName = 'InsertProjects';

export function insertProjects(dcOrVars, vars) {
  return executeMutation(insertProjectsRef(dcOrVars, vars));
}

export const insertRateCardsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertRateCards', inputVars);
}
insertRateCardsRef.operationName = 'InsertRateCards';

export function insertRateCards(dcOrVars, vars) {
  return executeMutation(insertRateCardsRef(dcOrVars, vars));
}

export const insertRolesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertRoles', inputVars);
}
insertRolesRef.operationName = 'InsertRoles';

export function insertRoles(dcOrVars, vars) {
  return executeMutation(insertRolesRef(dcOrVars, vars));
}

export const insertTimeEntriesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertTimeEntries', inputVars);
}
insertTimeEntriesRef.operationName = 'InsertTimeEntries';

export function insertTimeEntries(dcOrVars, vars) {
  return executeMutation(insertTimeEntriesRef(dcOrVars, vars));
}

export const createAppUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAppUser', inputVars);
}
createAppUserRef.operationName = 'CreateAppUser';

export function createAppUser(dcOrVars, vars) {
  return executeMutation(createAppUserRef(dcOrVars, vars));
}

export const updateAppUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateAppUser', inputVars);
}
updateAppUserRef.operationName = 'UpdateAppUser';

export function updateAppUser(dcOrVars, vars) {
  return executeMutation(updateAppUserRef(dcOrVars, vars));
}

export const deleteAppUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteAppUser', inputVars);
}
deleteAppUserRef.operationName = 'DeleteAppUser';

export function deleteAppUser(dcOrVars, vars) {
  return executeMutation(deleteAppUserRef(dcOrVars, vars));
}

