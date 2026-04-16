import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 15,
            retry: 1,
        },
    },
});
export function AppProviders({ children }) {
    return _jsx(QueryClientProvider, { client: queryClient, children: children });
}
