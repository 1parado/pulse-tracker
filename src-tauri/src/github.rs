use crate::models::GhIssueInfo;

/// 拉取 GitHub issue 的状态信息。repo 形如 "owner/repo"，number 为 issue 编号。
pub fn fetch_issue(repo: &str, number: i64, token: Option<String>) -> Result<GhIssueInfo, String> {
    let parts: Vec<&str> = repo.split('/').filter(|s| !s.is_empty()).collect();
    if parts.len() != 2 {
        return Err("仓库格式应为 owner/repo".to_string());
    }
    let repo = format!("{}/{}", parts[0], parts[1]);
    let url = format!("https://api.github.com/repos/{}/issues/{}", repo, number);

    let mut req = ureq::get(&url)
        .set("User-Agent", "pulse-tracker")
        .set("Accept", "application/vnd.github+json");
    if let Some(t) = &token {
        if !t.is_empty() {
            req = req.set("Authorization", &format!("Bearer {}", t));
        }
    }

    let resp = req.call().map_err(|e| match e {
        ureq::Error::Status(code, r) => format!(
            "GitHub API HTTP {}: {}",
            code,
            r.into_string().unwrap_or_default()
        ),
        other => other.to_string(),
    })?;

    let v: serde_json::Value = resp.into_json().map_err(|e| e.to_string())?;
    Ok(GhIssueInfo {
        state: v
            .get("state")
            .and_then(|x| x.as_str())
            .unwrap_or("unknown")
            .to_string(),
        title: v
            .get("title")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string(),
        url: v
            .get("html_url")
            .and_then(|x| x.as_str())
            .unwrap_or("")
            .to_string(),
    })
}
