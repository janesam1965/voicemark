import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Base URL for API requests - points to our server
// Use environment variable if set, otherwise default to localhost:5002
// For Android emulator, set VITE_API_BASE_URL=http://10.0.2.2:5002 in .env file
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002';

// Log the API base URL for debugging
console.log('API Base URL:', API_BASE_URL);

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Handle FormData (for file uploads) differently than JSON
  const isFormData = data instanceof FormData;
  
  // Prepend base URL if the URL is not absolute
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  
  console.log(`Making ${method} request to:`, fullUrl);
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: !isFormData && data ? { "Content-Type": "application/json" } : {},
      body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
