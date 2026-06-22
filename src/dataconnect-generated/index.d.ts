import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Allocations_Key {
  id: UUIDString;
  __typename?: 'Allocations_Key';
}

export interface AppUsers_Key {
  id: UUIDString;
  __typename?: 'AppUsers_Key';
}

export interface BillabilityRuleConditions_Key {
  id: UUIDString;
  __typename?: 'BillabilityRuleConditions_Key';
}

export interface BillabilityRules_Key {
  id: UUIDString;
  __typename?: 'BillabilityRules_Key';
}

export interface ClientTeamAllocations_Key {
  id: UUIDString;
  __typename?: 'ClientTeamAllocations_Key';
}

export interface CreateAppUserData {
  appUsers_insert: AppUsers_Key;
}

export interface CreateAppUserVariables {
  email: string;
  role: string;
  addedBy?: string | null;
}

export interface DailyAllocations_Key {
  id: UUIDString;
  __typename?: 'DailyAllocations_Key';
}

export interface DataImports_Key {
  id: UUIDString;
  __typename?: 'DataImports_Key';
}

export interface DeleteAppUserData {
  appUsers_delete?: AppUsers_Key | null;
}

export interface DeleteAppUserVariables {
  id: UUIDString;
}

export interface GetAppUserByEmailData {
  appUserss: ({
    id: UUIDString;
    email: string;
    role: string;
    createdAt: DateString;
    addedBy?: string | null;
  } & AppUsers_Key)[];
}

export interface GetAppUserByEmailVariables {
  email: string;
}

export interface GetProjectData {
  projects?: {
    id: UUIDString;
    title: string;
  } & Projects_Key;
}

export interface GetProjectVariables {
  id: UUIDString;
}

export interface InsertAllocationsData {
  allocations_insert: Allocations_Key;
}

export interface InsertAllocationsVariables {
  allocatedHours: number;
  createdAt: DateString;
  id: UUIDString;
  personId?: UUIDString | null;
  projectScopeId?: UUIDString | null;
}

export interface InsertBillabilityRuleConditionsData {
  billabilityRuleConditions_insert: BillabilityRuleConditions_Key;
}

export interface InsertBillabilityRuleConditionsVariables {
  createdAt: DateString;
  field: string;
  id: UUIDString;
  logicOperator: string;
  operator: string;
  ruleId: UUIDString;
  value: string;
}

export interface InsertBillabilityRulesData {
  billabilityRules_insert: BillabilityRules_Key;
}

export interface InsertBillabilityRulesVariables {
  createdAt: DateString;
  id: UUIDString;
  isBillable: boolean;
  logicOperator: string;
  name: string;
  priority: number;
}

export interface InsertClientTeamAllocationsData {
  clientTeamAllocations_insert: ClientTeamAllocations_Key;
}

export interface InsertClientTeamAllocationsVariables {
  clientName: string;
  createdAt: DateString;
  id: UUIDString;
  personId: UUIDString;
  priority: number;
  roleId: UUIDString;
}

export interface InsertDailyAllocationsData {
  dailyAllocations_insert: DailyAllocations_Key;
}

export interface InsertDailyAllocationsVariables {
  allocationId: UUIDString;
  createdAt: DateString;
  date: DateString;
  hours: number;
  id: UUIDString;
}

export interface InsertDataImportsData {
  dataImports_insert: DataImports_Key;
}

export interface InsertDataImportsVariables {
  dataset: string;
  id: UUIDString;
  lastImportedAt: string;
  rowCount: number;
}

export interface InsertPeopleData {
  people_insert: People_Key;
}

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

export interface InsertPhaseAllocationsData {
  phaseAllocations_insert: PhaseAllocations_Key;
}

export interface InsertPhaseAllocationsVariables {
  allocationId?: UUIDString | null;
  createdAt: DateString;
  hours: number;
  id: UUIDString;
  phaseId: UUIDString;
  projectScopeId?: UUIDString | null;
}

export interface InsertProjectMonthlyRevenueData {
  projectMonthlyRevenue_insert: ProjectMonthlyRevenue_Key;
}

export interface InsertProjectMonthlyRevenueVariables {
  createdAt: DateString;
  id: UUIDString;
  monthDate: DateString;
  projectId: UUIDString;
  value: number;
}

export interface InsertProjectPhasesData {
  projectPhases_insert: ProjectPhases_Key;
}

export interface InsertProjectPhasesVariables {
  createdAt: DateString;
  endDate?: DateString | null;
  id: UUIDString;
  phaseName: string;
  projectId: UUIDString;
  sortOrder: number;
  startDate?: DateString | null;
}

export interface InsertProjectScopesData {
  projectScopes_insert: ProjectScopes_Key;
}

export interface InsertProjectScopesVariables {
  createdAt: DateString;
  id: UUIDString;
  phasePercentages?: unknown | null;
  projectId?: UUIDString | null;
  roleId?: UUIDString | null;
  scopedHours: number;
}

export interface InsertProjectsData {
  projects_insert: Projects_Key;
}

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

export interface InsertRateCardsData {
  rateCards_insert: RateCards_Key;
}

export interface InsertRateCardsVariables {
  createdAt: DateString;
  currency: string;
  hourlyRate: number;
  id: UUIDString;
  name: string;
  roleId?: UUIDString | null;
}

export interface InsertRolesData {
  roles_insert: Roles_Key;
}

export interface InsertRolesVariables {
  billableCapacityHours: number;
  createdAt: DateString;
  id: UUIDString;
  name: string;
}

export interface InsertTimeEntriesData {
  timeEntries_insert: TimeEntries_Key;
}

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

export interface ListAllocationsData {
  allocationss: ({
    id: UUIDString;
    person_id?: UUIDString | null;
    project_scope_id?: UUIDString | null;
    allocated_hours: number;
  } & Allocations_Key)[];
}

export interface ListAppUsersData {
  appUserss: ({
    id: UUIDString;
    email: string;
    role: string;
    createdAt: DateString;
    addedBy?: string | null;
  } & AppUsers_Key)[];
}

export interface ListDataImportsData {
  dataImportss: ({
    dataset: string;
    last_imported_at: string;
    row_count: number;
  })[];
}

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

export interface ListRateCardsData {
  rateCardss: ({
    id: UUIDString;
    name: string;
    hourly_rate: number;
    currency: string;
    role_id?: UUIDString | null;
  } & RateCards_Key)[];
}

export interface ListRolesData {
  roless: ({
    id: UUIDString;
    name: string;
    billable_capacity_hours: number;
  } & Roles_Key)[];
}

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

export interface ListTimeEntriesByProjectVariables {
  projectId: UUIDString;
}

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

export interface People_Key {
  id: UUIDString;
  __typename?: 'People_Key';
}

export interface PhaseAllocations_Key {
  id: UUIDString;
  __typename?: 'PhaseAllocations_Key';
}

export interface ProjectMonthlyRevenue_Key {
  id: UUIDString;
  __typename?: 'ProjectMonthlyRevenue_Key';
}

export interface ProjectPhases_Key {
  id: UUIDString;
  __typename?: 'ProjectPhases_Key';
}

export interface ProjectScopes_Key {
  id: UUIDString;
  __typename?: 'ProjectScopes_Key';
}

export interface Projects_Key {
  id: UUIDString;
  __typename?: 'Projects_Key';
}

export interface RateCards_Key {
  id: UUIDString;
  __typename?: 'RateCards_Key';
}

export interface Roles_Key {
  id: UUIDString;
  __typename?: 'Roles_Key';
}

export interface TimeEntries_Key {
  id: UUIDString;
  __typename?: 'TimeEntries_Key';
}

export interface UpdateAppUserData {
  appUsers_update?: AppUsers_Key | null;
}

export interface UpdateAppUserVariables {
  id: UUIDString;
  role: string;
}

interface ListProjectsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProjectsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListProjectsData, undefined>;
  operationName: string;
}
export const listProjectsRef: ListProjectsRef;

export function listProjects(): QueryPromise<ListProjectsData, undefined>;
export function listProjects(dc: DataConnect): QueryPromise<ListProjectsData, undefined>;

interface GetProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetProjectVariables): QueryRef<GetProjectData, GetProjectVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetProjectVariables): QueryRef<GetProjectData, GetProjectVariables>;
  operationName: string;
}
export const getProjectRef: GetProjectRef;

export function getProject(vars: GetProjectVariables): QueryPromise<GetProjectData, GetProjectVariables>;
export function getProject(dc: DataConnect, vars: GetProjectVariables): QueryPromise<GetProjectData, GetProjectVariables>;

interface ListPeopleRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListPeopleData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListPeopleData, undefined>;
  operationName: string;
}
export const listPeopleRef: ListPeopleRef;

export function listPeople(): QueryPromise<ListPeopleData, undefined>;
export function listPeople(dc: DataConnect): QueryPromise<ListPeopleData, undefined>;

interface ListRolesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRolesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListRolesData, undefined>;
  operationName: string;
}
export const listRolesRef: ListRolesRef;

export function listRoles(): QueryPromise<ListRolesData, undefined>;
export function listRoles(dc: DataConnect): QueryPromise<ListRolesData, undefined>;

interface ListRateCardsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListRateCardsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListRateCardsData, undefined>;
  operationName: string;
}
export const listRateCardsRef: ListRateCardsRef;

export function listRateCards(): QueryPromise<ListRateCardsData, undefined>;
export function listRateCards(dc: DataConnect): QueryPromise<ListRateCardsData, undefined>;

interface ListTimeEntriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListTimeEntriesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListTimeEntriesData, undefined>;
  operationName: string;
}
export const listTimeEntriesRef: ListTimeEntriesRef;

export function listTimeEntries(): QueryPromise<ListTimeEntriesData, undefined>;
export function listTimeEntries(dc: DataConnect): QueryPromise<ListTimeEntriesData, undefined>;

interface ListTimeEntriesByProjectRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListTimeEntriesByProjectVariables): QueryRef<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListTimeEntriesByProjectVariables): QueryRef<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;
  operationName: string;
}
export const listTimeEntriesByProjectRef: ListTimeEntriesByProjectRef;

export function listTimeEntriesByProject(vars: ListTimeEntriesByProjectVariables): QueryPromise<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;
export function listTimeEntriesByProject(dc: DataConnect, vars: ListTimeEntriesByProjectVariables): QueryPromise<ListTimeEntriesByProjectData, ListTimeEntriesByProjectVariables>;

interface ListProjectPhasesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListProjectPhasesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListProjectPhasesData, undefined>;
  operationName: string;
}
export const listProjectPhasesRef: ListProjectPhasesRef;

export function listProjectPhases(): QueryPromise<ListProjectPhasesData, undefined>;
export function listProjectPhases(dc: DataConnect): QueryPromise<ListProjectPhasesData, undefined>;

interface ListAllocationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllocationsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAllocationsData, undefined>;
  operationName: string;
}
export const listAllocationsRef: ListAllocationsRef;

export function listAllocations(): QueryPromise<ListAllocationsData, undefined>;
export function listAllocations(dc: DataConnect): QueryPromise<ListAllocationsData, undefined>;

interface ListDataImportsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListDataImportsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListDataImportsData, undefined>;
  operationName: string;
}
export const listDataImportsRef: ListDataImportsRef;

export function listDataImports(): QueryPromise<ListDataImportsData, undefined>;
export function listDataImports(dc: DataConnect): QueryPromise<ListDataImportsData, undefined>;

interface GetAppUserByEmailRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAppUserByEmailVariables): QueryRef<GetAppUserByEmailData, GetAppUserByEmailVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetAppUserByEmailVariables): QueryRef<GetAppUserByEmailData, GetAppUserByEmailVariables>;
  operationName: string;
}
export const getAppUserByEmailRef: GetAppUserByEmailRef;

export function getAppUserByEmail(vars: GetAppUserByEmailVariables): QueryPromise<GetAppUserByEmailData, GetAppUserByEmailVariables>;
export function getAppUserByEmail(dc: DataConnect, vars: GetAppUserByEmailVariables): QueryPromise<GetAppUserByEmailData, GetAppUserByEmailVariables>;

interface ListAppUsersRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAppUsersData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListAppUsersData, undefined>;
  operationName: string;
}
export const listAppUsersRef: ListAppUsersRef;

export function listAppUsers(): QueryPromise<ListAppUsersData, undefined>;
export function listAppUsers(dc: DataConnect): QueryPromise<ListAppUsersData, undefined>;

interface InsertAllocationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertAllocationsVariables): MutationRef<InsertAllocationsData, InsertAllocationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertAllocationsVariables): MutationRef<InsertAllocationsData, InsertAllocationsVariables>;
  operationName: string;
}
export const insertAllocationsRef: InsertAllocationsRef;

export function insertAllocations(vars: InsertAllocationsVariables): MutationPromise<InsertAllocationsData, InsertAllocationsVariables>;
export function insertAllocations(dc: DataConnect, vars: InsertAllocationsVariables): MutationPromise<InsertAllocationsData, InsertAllocationsVariables>;

interface InsertBillabilityRuleConditionsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertBillabilityRuleConditionsVariables): MutationRef<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertBillabilityRuleConditionsVariables): MutationRef<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;
  operationName: string;
}
export const insertBillabilityRuleConditionsRef: InsertBillabilityRuleConditionsRef;

export function insertBillabilityRuleConditions(vars: InsertBillabilityRuleConditionsVariables): MutationPromise<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;
export function insertBillabilityRuleConditions(dc: DataConnect, vars: InsertBillabilityRuleConditionsVariables): MutationPromise<InsertBillabilityRuleConditionsData, InsertBillabilityRuleConditionsVariables>;

interface InsertBillabilityRulesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertBillabilityRulesVariables): MutationRef<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertBillabilityRulesVariables): MutationRef<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;
  operationName: string;
}
export const insertBillabilityRulesRef: InsertBillabilityRulesRef;

export function insertBillabilityRules(vars: InsertBillabilityRulesVariables): MutationPromise<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;
export function insertBillabilityRules(dc: DataConnect, vars: InsertBillabilityRulesVariables): MutationPromise<InsertBillabilityRulesData, InsertBillabilityRulesVariables>;

interface InsertClientTeamAllocationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertClientTeamAllocationsVariables): MutationRef<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertClientTeamAllocationsVariables): MutationRef<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;
  operationName: string;
}
export const insertClientTeamAllocationsRef: InsertClientTeamAllocationsRef;

export function insertClientTeamAllocations(vars: InsertClientTeamAllocationsVariables): MutationPromise<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;
export function insertClientTeamAllocations(dc: DataConnect, vars: InsertClientTeamAllocationsVariables): MutationPromise<InsertClientTeamAllocationsData, InsertClientTeamAllocationsVariables>;

interface InsertDailyAllocationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertDailyAllocationsVariables): MutationRef<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertDailyAllocationsVariables): MutationRef<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;
  operationName: string;
}
export const insertDailyAllocationsRef: InsertDailyAllocationsRef;

export function insertDailyAllocations(vars: InsertDailyAllocationsVariables): MutationPromise<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;
export function insertDailyAllocations(dc: DataConnect, vars: InsertDailyAllocationsVariables): MutationPromise<InsertDailyAllocationsData, InsertDailyAllocationsVariables>;

interface InsertDataImportsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertDataImportsVariables): MutationRef<InsertDataImportsData, InsertDataImportsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertDataImportsVariables): MutationRef<InsertDataImportsData, InsertDataImportsVariables>;
  operationName: string;
}
export const insertDataImportsRef: InsertDataImportsRef;

export function insertDataImports(vars: InsertDataImportsVariables): MutationPromise<InsertDataImportsData, InsertDataImportsVariables>;
export function insertDataImports(dc: DataConnect, vars: InsertDataImportsVariables): MutationPromise<InsertDataImportsData, InsertDataImportsVariables>;

interface InsertPeopleRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertPeopleVariables): MutationRef<InsertPeopleData, InsertPeopleVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertPeopleVariables): MutationRef<InsertPeopleData, InsertPeopleVariables>;
  operationName: string;
}
export const insertPeopleRef: InsertPeopleRef;

export function insertPeople(vars: InsertPeopleVariables): MutationPromise<InsertPeopleData, InsertPeopleVariables>;
export function insertPeople(dc: DataConnect, vars: InsertPeopleVariables): MutationPromise<InsertPeopleData, InsertPeopleVariables>;

interface InsertPhaseAllocationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertPhaseAllocationsVariables): MutationRef<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertPhaseAllocationsVariables): MutationRef<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;
  operationName: string;
}
export const insertPhaseAllocationsRef: InsertPhaseAllocationsRef;

export function insertPhaseAllocations(vars: InsertPhaseAllocationsVariables): MutationPromise<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;
export function insertPhaseAllocations(dc: DataConnect, vars: InsertPhaseAllocationsVariables): MutationPromise<InsertPhaseAllocationsData, InsertPhaseAllocationsVariables>;

interface InsertProjectMonthlyRevenueRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertProjectMonthlyRevenueVariables): MutationRef<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertProjectMonthlyRevenueVariables): MutationRef<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;
  operationName: string;
}
export const insertProjectMonthlyRevenueRef: InsertProjectMonthlyRevenueRef;

export function insertProjectMonthlyRevenue(vars: InsertProjectMonthlyRevenueVariables): MutationPromise<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;
export function insertProjectMonthlyRevenue(dc: DataConnect, vars: InsertProjectMonthlyRevenueVariables): MutationPromise<InsertProjectMonthlyRevenueData, InsertProjectMonthlyRevenueVariables>;

interface InsertProjectPhasesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertProjectPhasesVariables): MutationRef<InsertProjectPhasesData, InsertProjectPhasesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertProjectPhasesVariables): MutationRef<InsertProjectPhasesData, InsertProjectPhasesVariables>;
  operationName: string;
}
export const insertProjectPhasesRef: InsertProjectPhasesRef;

export function insertProjectPhases(vars: InsertProjectPhasesVariables): MutationPromise<InsertProjectPhasesData, InsertProjectPhasesVariables>;
export function insertProjectPhases(dc: DataConnect, vars: InsertProjectPhasesVariables): MutationPromise<InsertProjectPhasesData, InsertProjectPhasesVariables>;

interface InsertProjectScopesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertProjectScopesVariables): MutationRef<InsertProjectScopesData, InsertProjectScopesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertProjectScopesVariables): MutationRef<InsertProjectScopesData, InsertProjectScopesVariables>;
  operationName: string;
}
export const insertProjectScopesRef: InsertProjectScopesRef;

export function insertProjectScopes(vars: InsertProjectScopesVariables): MutationPromise<InsertProjectScopesData, InsertProjectScopesVariables>;
export function insertProjectScopes(dc: DataConnect, vars: InsertProjectScopesVariables): MutationPromise<InsertProjectScopesData, InsertProjectScopesVariables>;

interface InsertProjectsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertProjectsVariables): MutationRef<InsertProjectsData, InsertProjectsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertProjectsVariables): MutationRef<InsertProjectsData, InsertProjectsVariables>;
  operationName: string;
}
export const insertProjectsRef: InsertProjectsRef;

export function insertProjects(vars: InsertProjectsVariables): MutationPromise<InsertProjectsData, InsertProjectsVariables>;
export function insertProjects(dc: DataConnect, vars: InsertProjectsVariables): MutationPromise<InsertProjectsData, InsertProjectsVariables>;

interface InsertRateCardsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertRateCardsVariables): MutationRef<InsertRateCardsData, InsertRateCardsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertRateCardsVariables): MutationRef<InsertRateCardsData, InsertRateCardsVariables>;
  operationName: string;
}
export const insertRateCardsRef: InsertRateCardsRef;

export function insertRateCards(vars: InsertRateCardsVariables): MutationPromise<InsertRateCardsData, InsertRateCardsVariables>;
export function insertRateCards(dc: DataConnect, vars: InsertRateCardsVariables): MutationPromise<InsertRateCardsData, InsertRateCardsVariables>;

interface InsertRolesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertRolesVariables): MutationRef<InsertRolesData, InsertRolesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertRolesVariables): MutationRef<InsertRolesData, InsertRolesVariables>;
  operationName: string;
}
export const insertRolesRef: InsertRolesRef;

export function insertRoles(vars: InsertRolesVariables): MutationPromise<InsertRolesData, InsertRolesVariables>;
export function insertRoles(dc: DataConnect, vars: InsertRolesVariables): MutationPromise<InsertRolesData, InsertRolesVariables>;

interface InsertTimeEntriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: InsertTimeEntriesVariables): MutationRef<InsertTimeEntriesData, InsertTimeEntriesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: InsertTimeEntriesVariables): MutationRef<InsertTimeEntriesData, InsertTimeEntriesVariables>;
  operationName: string;
}
export const insertTimeEntriesRef: InsertTimeEntriesRef;

export function insertTimeEntries(vars: InsertTimeEntriesVariables): MutationPromise<InsertTimeEntriesData, InsertTimeEntriesVariables>;
export function insertTimeEntries(dc: DataConnect, vars: InsertTimeEntriesVariables): MutationPromise<InsertTimeEntriesData, InsertTimeEntriesVariables>;

interface CreateAppUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAppUserVariables): MutationRef<CreateAppUserData, CreateAppUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateAppUserVariables): MutationRef<CreateAppUserData, CreateAppUserVariables>;
  operationName: string;
}
export const createAppUserRef: CreateAppUserRef;

export function createAppUser(vars: CreateAppUserVariables): MutationPromise<CreateAppUserData, CreateAppUserVariables>;
export function createAppUser(dc: DataConnect, vars: CreateAppUserVariables): MutationPromise<CreateAppUserData, CreateAppUserVariables>;

interface UpdateAppUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UpdateAppUserVariables): MutationRef<UpdateAppUserData, UpdateAppUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UpdateAppUserVariables): MutationRef<UpdateAppUserData, UpdateAppUserVariables>;
  operationName: string;
}
export const updateAppUserRef: UpdateAppUserRef;

export function updateAppUser(vars: UpdateAppUserVariables): MutationPromise<UpdateAppUserData, UpdateAppUserVariables>;
export function updateAppUser(dc: DataConnect, vars: UpdateAppUserVariables): MutationPromise<UpdateAppUserData, UpdateAppUserVariables>;

interface DeleteAppUserRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeleteAppUserVariables): MutationRef<DeleteAppUserData, DeleteAppUserVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeleteAppUserVariables): MutationRef<DeleteAppUserData, DeleteAppUserVariables>;
  operationName: string;
}
export const deleteAppUserRef: DeleteAppUserRef;

export function deleteAppUser(vars: DeleteAppUserVariables): MutationPromise<DeleteAppUserData, DeleteAppUserVariables>;
export function deleteAppUser(dc: DataConnect, vars: DeleteAppUserVariables): MutationPromise<DeleteAppUserData, DeleteAppUserVariables>;

