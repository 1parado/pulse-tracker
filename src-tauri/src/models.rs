use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Issue {
    pub id: String,
    pub seq: i64,
    pub display_key: String,
    pub project_id: Option<String>,
    pub cycle_id: Option<String>,
    pub title: String,
    pub description: String,
    pub status: String,
    pub priority: String,
    pub gh_repo: Option<String>,
    pub gh_number: Option<i64>,
    pub gh_state: Option<String>,
    pub gh_title: Option<String>,
    pub gh_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub prefix: String,
    pub color: String,
    pub description: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cycle {
    pub id: String,
    pub project_id: Option<String>,
    pub name: String,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Comment {
    pub id: String,
    pub issue_id: String,
    pub author: String,
    pub body: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Attachment {
    pub id: String,
    pub issue_id: String,
    pub name: String,
    pub size: i64,
    pub path: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewIssue {
    pub title: String,
    pub description: Option<String>,
    pub project_id: Option<String>,
    pub cycle_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateIssue {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub project_id: Option<String>,
    pub cycle_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    #[serde(default)]
    pub clear_project: bool,
    #[serde(default)]
    pub clear_cycle: bool,
    #[serde(default)]
    pub clear_github: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewProject {
    pub name: String,
    pub prefix: Option<String>,
    pub color: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewCycle {
    pub name: String,
    pub project_id: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewComment {
    pub issue_id: String,
    pub body: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewAttachment {
    pub issue_id: String,
    pub name: String,
    pub data_base64: String,
}

#[derive(Debug, Serialize)]
pub struct GhIssueInfo {
    pub state: String,
    pub title: String,
    pub url: String,
}
