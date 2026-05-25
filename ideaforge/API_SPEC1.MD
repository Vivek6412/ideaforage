## PROJECTS
GET    /api/v1/projects
  returns: [{ id, name, current_state, created_at, updated_at }]

POST   /api/v1/projects
  body: { name }
  returns: { project }

GET    /api/v1/projects/{id}
  returns: { project, stage_outputs, execution_tasks }

DELETE /api/v1/projects/{id}
  returns: { message }