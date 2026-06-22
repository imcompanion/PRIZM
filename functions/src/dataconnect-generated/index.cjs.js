const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'projectzen',
  location: 'us-east4'
};
exports.connectorConfig = connectorConfig;

const listProjectsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProjects');
}
listProjectsRef.operationName = 'ListProjects';
exports.listProjectsRef = listProjectsRef;

exports.listProjects = function listProjects(dc) {
  return executeQuery(listProjectsRef(dc));
};

const getProjectRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetProject', inputVars);
}
getProjectRef.operationName = 'GetProject';
exports.getProjectRef = getProjectRef;

exports.getProject = function getProject(dcOrVars, vars) {
  return executeQuery(getProjectRef(dcOrVars, vars));
};

const listPeopleRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListPeople');
}
listPeopleRef.operationName = 'ListPeople';
exports.listPeopleRef = listPeopleRef;

exports.listPeople = function listPeople(dc) {
  return executeQuery(listPeopleRef(dc));
};

const listRolesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListRoles');
}
listRolesRef.operationName = 'ListRoles';
exports.listRolesRef = listRolesRef;

exports.listRoles = function listRoles(dc) {
  return executeQuery(listRolesRef(dc));
};

const listRateCardsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListRateCards');
}
listRateCardsRef.operationName = 'ListRateCards';
exports.listRateCardsRef = listRateCardsRef;

exports.listRateCards = function listRateCards(dc) {
  return executeQuery(listRateCardsRef(dc));
};

const listTimeEntriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTimeEntries');
}
listTimeEntriesRef.operationName = 'ListTimeEntries';
exports.listTimeEntriesRef = listTimeEntriesRef;

exports.listTimeEntries = function listTimeEntries(dc) {
  return executeQuery(listTimeEntriesRef(dc));
};

const listTimeEntriesByProjectRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListTimeEntriesByProject', inputVars);
}
listTimeEntriesByProjectRef.operationName = 'ListTimeEntriesByProject';
exports.listTimeEntriesByProjectRef = listTimeEntriesByProjectRef;

exports.listTimeEntriesByProject = function listTimeEntriesByProject(dcOrVars, vars) {
  return executeQuery(listTimeEntriesByProjectRef(dcOrVars, vars));
};

const listProjectPhasesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListProjectPhases');
}
listProjectPhasesRef.operationName = 'ListProjectPhases';
exports.listProjectPhasesRef = listProjectPhasesRef;

exports.listProjectPhases = function listProjectPhases(dc) {
  return executeQuery(listProjectPhasesRef(dc));
};

const listAllocationsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAllocations');
}
listAllocationsRef.operationName = 'ListAllocations';
exports.listAllocationsRef = listAllocationsRef;

exports.listAllocations = function listAllocations(dc) {
  return executeQuery(listAllocationsRef(dc));
};

const listDataImportsRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListDataImports');
}
listDataImportsRef.operationName = 'ListDataImports';
exports.listDataImportsRef = listDataImportsRef;

exports.listDataImports = function listDataImports(dc) {
  return executeQuery(listDataImportsRef(dc));
};

const getAppUserByEmailRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAppUserByEmail', inputVars);
}
getAppUserByEmailRef.operationName = 'GetAppUserByEmail';
exports.getAppUserByEmailRef = getAppUserByEmailRef;

exports.getAppUserByEmail = function getAppUserByEmail(dcOrVars, vars) {
  return executeQuery(getAppUserByEmailRef(dcOrVars, vars));
};

const listAppUsersRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListAppUsers');
}
listAppUsersRef.operationName = 'ListAppUsers';
exports.listAppUsersRef = listAppUsersRef;

exports.listAppUsers = function listAppUsers(dc) {
  return executeQuery(listAppUsersRef(dc));
};

const insertAllocationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertAllocations', inputVars);
}
insertAllocationsRef.operationName = 'InsertAllocations';
exports.insertAllocationsRef = insertAllocationsRef;

exports.insertAllocations = function insertAllocations(dcOrVars, vars) {
  return executeMutation(insertAllocationsRef(dcOrVars, vars));
};

const insertBillabilityRuleConditionsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertBillabilityRuleConditions', inputVars);
}
insertBillabilityRuleConditionsRef.operationName = 'InsertBillabilityRuleConditions';
exports.insertBillabilityRuleConditionsRef = insertBillabilityRuleConditionsRef;

exports.insertBillabilityRuleConditions = function insertBillabilityRuleConditions(dcOrVars, vars) {
  return executeMutation(insertBillabilityRuleConditionsRef(dcOrVars, vars));
};

const insertBillabilityRulesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertBillabilityRules', inputVars);
}
insertBillabilityRulesRef.operationName = 'InsertBillabilityRules';
exports.insertBillabilityRulesRef = insertBillabilityRulesRef;

exports.insertBillabilityRules = function insertBillabilityRules(dcOrVars, vars) {
  return executeMutation(insertBillabilityRulesRef(dcOrVars, vars));
};

const insertClientTeamAllocationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertClientTeamAllocations', inputVars);
}
insertClientTeamAllocationsRef.operationName = 'InsertClientTeamAllocations';
exports.insertClientTeamAllocationsRef = insertClientTeamAllocationsRef;

exports.insertClientTeamAllocations = function insertClientTeamAllocations(dcOrVars, vars) {
  return executeMutation(insertClientTeamAllocationsRef(dcOrVars, vars));
};

const insertDailyAllocationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertDailyAllocations', inputVars);
}
insertDailyAllocationsRef.operationName = 'InsertDailyAllocations';
exports.insertDailyAllocationsRef = insertDailyAllocationsRef;

exports.insertDailyAllocations = function insertDailyAllocations(dcOrVars, vars) {
  return executeMutation(insertDailyAllocationsRef(dcOrVars, vars));
};

const insertDataImportsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertDataImports', inputVars);
}
insertDataImportsRef.operationName = 'InsertDataImports';
exports.insertDataImportsRef = insertDataImportsRef;

exports.insertDataImports = function insertDataImports(dcOrVars, vars) {
  return executeMutation(insertDataImportsRef(dcOrVars, vars));
};

const insertPeopleRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertPeople', inputVars);
}
insertPeopleRef.operationName = 'InsertPeople';
exports.insertPeopleRef = insertPeopleRef;

exports.insertPeople = function insertPeople(dcOrVars, vars) {
  return executeMutation(insertPeopleRef(dcOrVars, vars));
};

const insertPhaseAllocationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertPhaseAllocations', inputVars);
}
insertPhaseAllocationsRef.operationName = 'InsertPhaseAllocations';
exports.insertPhaseAllocationsRef = insertPhaseAllocationsRef;

exports.insertPhaseAllocations = function insertPhaseAllocations(dcOrVars, vars) {
  return executeMutation(insertPhaseAllocationsRef(dcOrVars, vars));
};

const insertProjectMonthlyRevenueRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertProjectMonthlyRevenue', inputVars);
}
insertProjectMonthlyRevenueRef.operationName = 'InsertProjectMonthlyRevenue';
exports.insertProjectMonthlyRevenueRef = insertProjectMonthlyRevenueRef;

exports.insertProjectMonthlyRevenue = function insertProjectMonthlyRevenue(dcOrVars, vars) {
  return executeMutation(insertProjectMonthlyRevenueRef(dcOrVars, vars));
};

const insertProjectPhasesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertProjectPhases', inputVars);
}
insertProjectPhasesRef.operationName = 'InsertProjectPhases';
exports.insertProjectPhasesRef = insertProjectPhasesRef;

exports.insertProjectPhases = function insertProjectPhases(dcOrVars, vars) {
  return executeMutation(insertProjectPhasesRef(dcOrVars, vars));
};

const insertProjectScopesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertProjectScopes', inputVars);
}
insertProjectScopesRef.operationName = 'InsertProjectScopes';
exports.insertProjectScopesRef = insertProjectScopesRef;

exports.insertProjectScopes = function insertProjectScopes(dcOrVars, vars) {
  return executeMutation(insertProjectScopesRef(dcOrVars, vars));
};

const insertProjectsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertProjects', inputVars);
}
insertProjectsRef.operationName = 'InsertProjects';
exports.insertProjectsRef = insertProjectsRef;

exports.insertProjects = function insertProjects(dcOrVars, vars) {
  return executeMutation(insertProjectsRef(dcOrVars, vars));
};

const insertRateCardsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertRateCards', inputVars);
}
insertRateCardsRef.operationName = 'InsertRateCards';
exports.insertRateCardsRef = insertRateCardsRef;

exports.insertRateCards = function insertRateCards(dcOrVars, vars) {
  return executeMutation(insertRateCardsRef(dcOrVars, vars));
};

const insertRolesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertRoles', inputVars);
}
insertRolesRef.operationName = 'InsertRoles';
exports.insertRolesRef = insertRolesRef;

exports.insertRoles = function insertRoles(dcOrVars, vars) {
  return executeMutation(insertRolesRef(dcOrVars, vars));
};

const insertTimeEntriesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'InsertTimeEntries', inputVars);
}
insertTimeEntriesRef.operationName = 'InsertTimeEntries';
exports.insertTimeEntriesRef = insertTimeEntriesRef;

exports.insertTimeEntries = function insertTimeEntries(dcOrVars, vars) {
  return executeMutation(insertTimeEntriesRef(dcOrVars, vars));
};

const createAppUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAppUser', inputVars);
}
createAppUserRef.operationName = 'CreateAppUser';
exports.createAppUserRef = createAppUserRef;

exports.createAppUser = function createAppUser(dcOrVars, vars) {
  return executeMutation(createAppUserRef(dcOrVars, vars));
};

const updateAppUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UpdateAppUser', inputVars);
}
updateAppUserRef.operationName = 'UpdateAppUser';
exports.updateAppUserRef = updateAppUserRef;

exports.updateAppUser = function updateAppUser(dcOrVars, vars) {
  return executeMutation(updateAppUserRef(dcOrVars, vars));
};

const deleteAppUserRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeleteAppUser', inputVars);
}
deleteAppUserRef.operationName = 'DeleteAppUser';
exports.deleteAppUserRef = deleteAppUserRef;

exports.deleteAppUser = function deleteAppUser(dcOrVars, vars) {
  return executeMutation(deleteAppUserRef(dcOrVars, vars));
};
