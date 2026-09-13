use crate::models::{GhComment, GhIssueInfo};

fn api_error(e: ureq::Error) -> String {
    match e {
        ureq::Error::Status(code, r) => format!(
            "GitHub API HTTP {}: {}",
            code,
            r.into_string().unwrap_or_default()
        ),
        other => other.to_string(),
    }
}

fn check_repo(repo: &str) -> Result<String, String> {
    let parts: Vec<&str> = repo.split('/').filter(|s| !s.is_empty()).collect();
    if parts.len() != 2 {
        return Err("仓库格式应为 owner/repo".to_string());
    }
    Ok(format!("{}/{}", parts[0], parts[1]))
}

fn new_request(method: &str, url: &str, token: Option<&str>) -> ureq::Request {
    let mut req = ureq::request(method, url)
        .set("User-Agent", "pulse-tracker")
        .set("Accept", "application/vnd.github+json");
    if let Some(t) = token.filter(|t| !t.is_empty()) {
        req = req.set("Authorization", &format!("Bearer {}", t));
    }
    req
}

fn parse_json(resp: ureq::Response) -> Result<serde_json::Value, String> {
    resp.into_json().map_err(|e| e.to_string())
}

/// 拉取 GitHub issue 的状态信息。repo 形如 "owner/repo"，number 为 issue 编号。
pub fn fetch_issue(repo: &str, number: i64, token: Option<String>) -> Result<GhIssueInfo, String> {
    let repo = check_repo(repo)?;
    let url = format!("https://api.github.com/repos/{}/issues/{}", repo, number);
    let resp = new_request("GET", &url, token.as_deref())
        .call()
        .map_err(api_error)?;
    let v = parse_json(resp)?;
    Ok(GhIssueInfo {
        number,
        state: v.get("state").and_then(|x| x.as_str()).unwrap_or("unknown").to_string(),
        title: v.get("title").and_then(|x| x.as_str()).unwrap_or("").to_string(),
        url: v.get("html_url").and_then(|x| x.as_str()).unwrap_or("").to_string(),
    })
}

/// 在远端仓库创建 issue，返回编号与元信息。
pub fn create_issue(
    repo: &str,
    title: &str,
    body: &str,
    token: Option<&str>,
) -> Result<GhIssueInfo, String> {
    let repo = check_repo(repo)?;
    let url = format!("https://api.github.com/repos/{}/issues", repo);
    let resp = new_request("POST", &url, token)
        .send_json(ureq::json!({ "title": title, "body": body }))
        .map_err(api_error)?;
    let v = parse_json(resp)?;
    Ok(GhIssueInfo {
        number: v.get("number").and_then(|x| x.as_i64()).unwrap_or(0),
        state: v.get("state").and_then(|x| x.as_str()).unwrap_or("open").to_string(),
        title: v.get("title").and_then(|x| x.as_str()).unwrap_or("").to_string(),
        url: v.get("html_url").and_then(|x| x.as_str()).unwrap_or("").to_string(),
    })
}

/// 推送本地状态到远端（open/closed）。
pub fn push_state(repo: &str, number: i64, state: &str, token: Option<&str>) -> Result<(), String> {
    let repo = check_repo(repo)?;
    let url = format!("https://api.github.com/repos/{}/issues/{}", repo, number);
    new_request("PATCH", &url, token)
        .send_json(ureq::json!({ "state": state }))
        .map_err(api_error)?;
    Ok(())
}

/// 推送评论到远端，返回远端评论 id。
pub fn push_comment(
    repo: &str,
    number: i64,
    body: &str,
    token: Option<&str>,
) -> Result<i64, String> {
    let repo = check_repo(repo)?;
    let url = format!("https://api.github.com/repos/{}/issues/{}/comments", repo, number);
    let resp = new_request("POST", &url, token)
        .send_json(ureq::json!({ "body": body }))
        .map_err(api_error)?;
    let v = parse_json(resp)?;
    Ok(v.get("id").and_then(|x| x.as_i64()).unwrap_or(0))
}

/// 拉取远端评论列表（按时间升序）。
pub fn list_comments(repo: &str, number: i64, token: Option<&str>) -> Result<Vec<GhComment>, String> {
    let repo = check_repo(repo)?;
    let url = format!(
        "https://api.github.com/repos/{}/issues/{}/comments?per_page=100",
        repo, number
    );
    let resp = new_request("GET", &url, token).call().map_err(api_error)?;
    let v = parse_json(resp)?;
    let comments: Vec<GhComment> =
        serde_json::from_value(v).map_err(|e| format!("解析评论失败: {}", e))?;
    Ok(comments)
}
