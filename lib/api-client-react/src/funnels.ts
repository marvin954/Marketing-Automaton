import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  MutationFunction,
  QueryFunction,
  QueryKey,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

// ---- Types ----

export interface FunnelSectionItem {
  title: string;
  description: string;
  icon?: string;
}

export interface FunnelTestimonial {
  name: string;
  role: string;
  company?: string;
  quote: string;
  rating?: number;
}

export interface FunnelPricingPlan {
  name: string;
  price: string;
  period?: string;
  features: string[];
  highlighted?: boolean;
  ctaText?: string;
}

export interface FunnelFaq {
  question: string;
  answer: string;
}

export interface FunnelSectionContent {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  ctaUrl?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  items?: FunnelSectionItem[];
  testimonials?: FunnelTestimonial[];
  plans?: FunnelPricingPlan[];
  faqs?: FunnelFaq[];
  videoUrl?: string;
  videoTitle?: string;
  formTitle?: string;
  formSubtitle?: string;
  fields?: Array<{ label: string; type: string; placeholder?: string }>;
}

export type FunnelSectionType = "hero" | "features" | "social_proof" | "pricing" | "faq" | "cta" | "optin" | "video";

export interface FunnelSection {
  id: string;
  type: FunnelSectionType;
  content: FunnelSectionContent;
}

export interface FunnelPage {
  id: number;
  funnelId: number;
  name: string;
  type: string;
  position: number;
  sections: FunnelSection[];
  publicSlug: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface FunnelRecord {
  id: number;
  businessId: number;
  name: string;
  description?: string | null;
  templateType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FunnelWithPages extends FunnelRecord {
  pages: FunnelPage[];
}

export interface FunnelInput {
  name: string;
  description?: string;
  templateType: string;
}

export interface FunnelPageUpdate {
  name?: string;
  sections: FunnelSection[];
}

// ---- List Funnels ----

export const getListFunnelsUrl = (businessId: number) =>
  `/api/businesses/${businessId}/funnels`;

export const getListFunnelsQueryKey = (businessId: number) =>
  [getListFunnelsUrl(businessId)] as const;

export const listFunnels = (businessId: number, options?: RequestInit) =>
  customFetch<FunnelRecord[]>(getListFunnelsUrl(businessId), { ...options, method: "GET" });

export function useListFunnels<TData = FunnelRecord[], TError = ErrorType<unknown>>(
  businessId: number,
  options?: {
    query?: UseQueryOptions<FunnelRecord[], TError, TData>;
    request?: RequestInit;
  }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getListFunnelsQueryKey(businessId);
  const queryFn: QueryFunction<FunnelRecord[]> = ({ signal }) =>
    listFunnels(businessId, { signal, ...requestOptions });
  const q = useQuery({ queryKey, queryFn, enabled: !!businessId, ...queryOptions } as UseQueryOptions<FunnelRecord[], TError, TData>) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...q, queryKey };
}

// ---- Get Funnel ----

export const getGetFunnelUrl = (businessId: number, id: number) =>
  `/api/businesses/${businessId}/funnels/${id}`;

export const getGetFunnelQueryKey = (businessId: number, id: number) =>
  [getGetFunnelUrl(businessId, id)] as const;

export const getFunnel = (businessId: number, id: number, options?: RequestInit) =>
  customFetch<FunnelWithPages>(getGetFunnelUrl(businessId, id), { ...options, method: "GET" });

export function useGetFunnel<TData = FunnelWithPages, TError = ErrorType<unknown>>(
  businessId: number,
  id: number,
  options?: {
    query?: UseQueryOptions<FunnelWithPages, TError, TData>;
    request?: RequestInit;
  }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetFunnelQueryKey(businessId, id);
  const queryFn: QueryFunction<FunnelWithPages> = ({ signal }) =>
    getFunnel(businessId, id, { signal, ...requestOptions });
  const q = useQuery({ queryKey, queryFn, enabled: !!businessId && !!id, ...queryOptions } as UseQueryOptions<FunnelWithPages, TError, TData>) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...q, queryKey };
}

// ---- Create Funnel ----

export const createFunnel = (businessId: number, body: FunnelInput, options?: RequestInit) =>
  customFetch<FunnelWithPages>(`/api/businesses/${businessId}/funnels`, {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    body: JSON.stringify(body),
  });

export function useCreateFunnel<TError = ErrorType<unknown>, TContext = unknown>(
  options?: UseMutationOptions<FunnelWithPages, TError, { businessId: number; body: FunnelInput }, TContext>
): UseMutationResult<FunnelWithPages, TError, { businessId: number; body: FunnelInput }, TContext> {
  const mutationFn: MutationFunction<FunnelWithPages, { businessId: number; body: FunnelInput }> = ({
    businessId,
    body,
  }) => createFunnel(businessId, body);
  return useMutation({ mutationFn, ...options });
}

// ---- Delete Funnel ----

export const deleteFunnel = (businessId: number, id: number, options?: RequestInit) =>
  customFetch<void>(`/api/businesses/${businessId}/funnels/${id}`, { ...options, method: "DELETE" });

export function useDeleteFunnel<TError = ErrorType<unknown>, TContext = unknown>(
  options?: UseMutationOptions<void, TError, { businessId: number; id: number }, TContext>
): UseMutationResult<void, TError, { businessId: number; id: number }, TContext> {
  const mutationFn: MutationFunction<void, { businessId: number; id: number }> = ({ businessId, id }) =>
    deleteFunnel(businessId, id);
  return useMutation({ mutationFn, ...options });
}

// ---- Update Funnel Page ----

export const updateFunnelPage = (
  businessId: number,
  funnelId: number,
  id: number,
  body: FunnelPageUpdate,
  options?: RequestInit
) =>
  customFetch<FunnelPage>(`/api/businesses/${businessId}/funnels/${funnelId}/pages/${id}`, {
    ...options,
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    body: JSON.stringify(body),
  });

// ---- Publish Page ----

export const publishPage = (businessId: number, funnelId: number, id: number, options?: RequestInit) =>
  customFetch<{ slug: string; url: string }>(`/api/businesses/${businessId}/funnels/${funnelId}/pages/${id}/publish`, {
    ...options,
    method: "PUT",
  });

export function usePublishPage<TError = ErrorType<unknown>, TContext = unknown>(
  options?: UseMutationOptions<{ slug: string; url: string }, TError, { businessId: number; funnelId: number; id: number }, TContext>
): UseMutationResult<{ slug: string; url: string }, TError, { businessId: number; funnelId: number; id: number }, TContext> {
  return useMutation({ mutationFn: ({ businessId, funnelId, id }) => publishPage(businessId, funnelId, id), ...options });
}

// ---- Unpublish Page ----

export const unpublishPage = (businessId: number, funnelId: number, id: number, options?: RequestInit) =>
  customFetch<{ unpublish: boolean; pageId: number }>(`/api/businesses/${businessId}/funnels/${funnelId}/pages/${id}/unpublish`, {
    ...options,
    method: "PUT",
  });

export function useUnpublishPage<TError = ErrorType<unknown>, TContext = unknown>(
  options?: UseMutationOptions<{ unpublish: boolean; pageId: number }, TError, { businessId: number; funnelId: number; id: number }, TContext>
): UseMutationResult<{ unpublish: boolean; pageId: number }, TError, { businessId: number; funnelId: number; id: number }, TContext> {
  return useMutation({ mutationFn: ({ businessId, funnelId, id }) => unpublishPage(businessId, funnelId, id), ...options });
}

export function useUpdateFunnelPage<TError = ErrorType<unknown>, TContext = unknown>(
  options?: UseMutationOptions<
    FunnelPage,
    TError,
    { businessId: number; funnelId: number; id: number; body: FunnelPageUpdate },
    TContext
  >
): UseMutationResult<
  FunnelPage,
  TError,
  { businessId: number; funnelId: number; id: number; body: FunnelPageUpdate },
  TContext
> {
  const mutationFn: MutationFunction<
    FunnelPage,
    { businessId: number; funnelId: number; id: number; body: FunnelPageUpdate }
  > = ({ businessId, funnelId, id, body }) => updateFunnelPage(businessId, funnelId, id, body);
  return useMutation({ mutationFn, ...options });
}
