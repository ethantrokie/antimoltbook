export interface RegisterData {
  email: string
  username: string
  display_name: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface User {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  follower_count: number
  following_count: number
}

export interface Post {
  id: string
  user_id: string
  content: string
  media_url: string | null
  media_type: string | null
  parent_id: string | null
  repost_of_id: string | null
  created_at: string
  author: {
    username: string
    display_name: string
    avatar_url: string | null
  }
  like_count: number
  reply_count: number
  repost_count: number
  liked_by_me: boolean
  reposted_by_me: boolean
  repost_of?: Post | null
}

export interface FeedResponse {
  posts: Post[]
  next_offset: number | null
}

export interface PostDetail {
  post: Post
  replies: Post[]
}

export interface CaptchaChallenge {
  challenge_id: string
  type: string
  data: string
}

export interface CaptchaChallengeSubmission {
  challenge_id: string
  response_data: string
}

export interface CaptchaResult {
  passed: boolean
  captcha_token?: string
  message?: string
}

export interface ReviewItem {
  id: string
  challenge_id: string
  type: string
  prompt: string
  response_data: string
  submitted_at: string
}

class ApiClient {
  private accessToken: string | null = null
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
  }

  setToken(token: string | null) {
    this.accessToken = token
  }

  getToken(): string | null {
    return this.accessToken
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api${path}`

    const headers: Record<string, string> = {}

    // Only set Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string> || {}),
      },
    })

    if (!res.ok) {
      const errorBody = await res.text()
      let message = `Request failed: ${res.status}`
      try {
        const parsed = JSON.parse(errorBody)
        message = parsed.detail || parsed.message || message
      } catch {
        // use default message
      }
      throw new Error(message)
    }

    if (res.status === 204) {
      return null as T
    }

    return res.json()
  }

  // Auth
  async register(data: RegisterData): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async login(data: LoginData): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async refresh(refreshToken: string): Promise<{ access_token: string }> {
    return this.request<{ access_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  }

  // Posts
  async getGlobalFeed(offset?: number): Promise<FeedResponse> {
    const query = offset ? `?offset=${offset}` : ''
    return this.request<FeedResponse>(`/posts/global${query}`)
  }

  async getHomeFeed(offset?: number): Promise<FeedResponse> {
    const query = offset ? `?offset=${offset}` : ''
    return this.request<FeedResponse>(`/posts/home${query}`)
  }

  async createPost(data: { content: string; media_url?: string; media_type?: string; captcha_token: string }): Promise<Post> {
    return this.request<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getPost(id: string): Promise<PostDetail> {
    return this.request<PostDetail>(`/posts/${id}`)
  }

  async deletePost(id: string): Promise<null> {
    return this.request<null>(`/posts/${id}`, {
      method: 'DELETE',
    })
  }

  async likePost(id: string): Promise<null> {
    return this.request<null>(`/posts/${id}/like`, {
      method: 'POST',
    })
  }

  async unlikePost(id: string): Promise<null> {
    return this.request<null>(`/posts/${id}/like`, {
      method: 'DELETE',
    })
  }

  async repost(id: string, captchaToken: string): Promise<Post> {
    return this.request<Post>(`/posts/${id}/repost`, {
      method: 'POST',
      body: JSON.stringify({ captcha_token: captchaToken }),
    })
  }

  async reply(id: string, data: { content: string; media_url?: string; media_type?: string; captcha_token: string }): Promise<Post> {
    return this.request<Post>(`/posts/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Users
  async getUser(username: string): Promise<User & { posts: Post[] }> {
    return this.request<User & { posts: Post[] }>(`/users/${username}`)
  }

  async updateProfile(data: { display_name?: string; bio?: string; avatar_url?: string }): Promise<User> {
    return this.request<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async follow(username: string): Promise<null> {
    return this.request<null>(`/users/${username}/follow`, {
      method: 'POST',
    })
  }

  async unfollow(username: string): Promise<null> {
    return this.request<null>(`/users/${username}/follow`, {
      method: 'DELETE',
    })
  }

  async getFollowers(username: string): Promise<User[]> {
    return this.request<User[]>(`/users/${username}/followers`)
  }

  async getFollowing(username: string): Promise<User[]> {
    return this.request<User[]>(`/users/${username}/following`)
  }

  // CAPTCHA
  async getChallenge(type?: string): Promise<CaptchaChallenge> {
    const query = type ? `?type=${type}` : ''
    return this.request<CaptchaChallenge>(`/captcha/challenge${query}`)
  }

  async submitChallenge(data: CaptchaChallengeSubmission): Promise<CaptchaResult> {
    return this.request<CaptchaResult>('/captcha/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getReviewQueue(): Promise<ReviewItem[]> {
    return this.request<ReviewItem[]>('/captcha/review')
  }

  async submitReview(id: string, approved: boolean): Promise<null> {
    return this.request<null>(`/captcha/review/${id}`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    })
  }

  // Media
  async uploadMedia(file: File): Promise<{ url: string; media_type: string }> {
    const formData = new FormData()
    formData.append('file', file)

    return this.request<{ url: string; media_type: string }>('/media/upload', {
      method: 'POST',
      body: formData,
    })
  }
}

export const api = new ApiClient()
