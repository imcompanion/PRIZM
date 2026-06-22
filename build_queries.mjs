const fs = require('fs');

const schema = `
query ListProjects @auth(level: PUBLIC) {
  projectss {
    id title opportunity_number sf_account parent_account ultimate_parent office
    start_date end_date rate_card_id rate_card_discount fee_calc_currency
    fx_rate_gbp fx_rate_usd price media_cost gross_budget extra_data
    opportunity_record_type stage
    project_scopes_on_project {
      id role_id scoped_hours phase_percentages
      role: roles_on_role { name billable_capacity_hours }
      allocations_on_project_scope {
        id person_id allocated_hours date
        person: people_on_person { name annual_salary }
      }
    }
  }
}

query GetProject($id: String!) @auth(level: PUBLIC) {
  project(id: $id) {
    id title
    project_scopes_on_project {
      id role_id scoped_hours phase_percentages
    }
  }
}

query ListPeople @auth(level: PUBLIC) {
  peoples {
    id code name team office role_id overall_start_date overall_end_date
    employment_start_date employment_end_date status annual_salary
    role: roles_on_role { name billable_capacity_hours }
  }
}

query ListRoles @auth(level: PUBLIC) {
  roless { id name billable_capacity_hours }
}

query ListRateCards @auth(level: PUBLIC) {
  rateCardss {
    id name hourly_rate currency role_id
    role: roles_on_role { name }
  }
}

query ListTimeEntries @auth(level: PUBLIC) {
  timeEntriess(limit: 1000, orderBy: [{date: DESC}]) {
    id date hours notes project_id person_id
    project: projects_on_project { title opportunity_record_type revenue stage office }
    person: people_on_person { name team annual_salary role: roles_on_role { name billable_capacity_hours } }
  }
}

query ListTimeEntriesByProject($projectId: String!) @auth(level: PUBLIC) {
  timeEntriess(where: {project_id: {eq: $projectId}}) {
    id date hours notes project_id person_id
    person: people_on_person { name team role: roles_on_role { name } }
  }
}

query ListProjectPhases @auth(level: PUBLIC) {
  projectPhasess { id project_id phase_name start_date end_date sort_order }
}

query ListAllocations @auth(level: PUBLIC) {
  allocationss {
    id person_id project_scope_id allocated_hours date
    person: people_on_person { name }
  }
}

query ListDataImports @auth(level: PUBLIC) {
  dataImportss { dataset last_imported_at row_count }
}
`;

fs.writeFileSync('dataconnect/example/queries.gql', schema);
console.log('queries.gql generated!');
