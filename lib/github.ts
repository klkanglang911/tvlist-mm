import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const GITHUB_CONFIG = {
  owner: (process.env.GITHUB_OWNER || '').trim(),
  repo: (process.env.GITHUB_REPO || '').trim(),
  branch: (process.env.GITHUB_BRANCH || 'main').trim(),
  dataPath: (process.env.GITHUB_DATA_PATH || 'data/channels.json').trim(),
};

export interface GitHubFile {
  content: string;
  sha: string;
}

/**
 * 从 GitHub 读取文件
 */
export async function getFileFromGitHub(path: string): Promise<GitHubFile | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      path: path,
      ref: GITHUB_CONFIG.branch,
    });

    if ('content' in data && 'sha' in data) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { content, sha: data.sha };
    }
    return null;
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * 向 GitHub 写入文件
 */
export async function updateFileOnGitHub(
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<string> {
  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner: GITHUB_CONFIG.owner,
    repo: GITHUB_CONFIG.repo,
    path: path,
    message: message,
    content: Buffer.from(content).toString('base64'),
    branch: GITHUB_CONFIG.branch,
    sha: sha,
  });

  return data.commit.sha!;
}

/**
 * 获取文件的提交历史
 */
export async function getFileHistory(path: string, perPage: number = 20): Promise<any[]> {
  try {
    const { data } = await octokit.repos.listCommits({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      path: path,
      per_page: perPage,
    });

    return data.map((commit) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date || '',
    }));
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return [];
  }
}

/**
 * 获取特定版本的文件内容
 */
export async function getFileAtCommit(path: string, sha: string): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      path: path,
      ref: sha,
    });

    if ('content' in data) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch (error) {
    console.error('获取历史版本失败:', error);
    return null;
  }
}

export { GITHUB_CONFIG };
