import axios, { AxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * SWR fetcher. Usage: useSWR('/resume', fetcher)
 */
export const fetcher = <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  apiClient.get<T>(url, config).then((res) => res.data);

// ----- Resume types -----

export interface Resume {
  id: string;
  fullName: string;
  contact: string;
  experience: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ResumeInput = Omit<Resume, 'id' | 'createdAt' | 'updatedAt'>;

export interface GenerateAIPayload {
  resumeId?: string;
  prompt: string;
  fields?: Record<string, unknown>;
}

export interface NotifySlackPayload {
  message: string;
  channel?: string;
}

// ----- API functions -----

export async function getResumes(): Promise<Resume[]> {
  const res = await apiClient.get<Resume[]>('/resume');
  return res.data;
}

export async function createResume(data: ResumeInput): Promise<Resume> {
  const res = await apiClient.post<Resume>('/resume', data);
  return res.data;
}

export async function getResume(id: string): Promise<Resume> {
  const res = await apiClient.get<Resume>(`/resume/${id}`);
  return res.data;
}

export async function updateResume(id: string, data: Partial<ResumeInput>): Promise<Resume> {
  const res = await apiClient.put<Resume>(`/resume/${id}`, data);
  return res.data;
}

export async function deleteResume(id: string): Promise<void> {
  await apiClient.delete(`/resume/${id}`);
}

export async function generateAI(payload: GenerateAIPayload): Promise<{ content: string }> {
  const res = await apiClient.post<{ content: string }>('/ai/generate', payload);
  return res.data;
}

export async function notifySlack(payload: NotifySlackPayload): Promise<{ ok: boolean }> {
  const res = await apiClient.post<{ ok: boolean }>('/integrations/slack/notify', payload);
  return res.data;
}
