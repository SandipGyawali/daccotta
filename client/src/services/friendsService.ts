import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { useAuth } from "@/hooks/useAuth"

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api`
interface FriendMovie {
    id: string
    movie_id: string
    title: string
    poster_path: string
    backdrop_path: string
    overview: string
    release_date: string
    friend: string
}

interface FriendMoviesResponse {
    friend: string
    movies: FriendMovie[]
}
export function useFriends() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    const getFriends = async ({page, limit} : {page: number; limit: number}) => {
        const idToken = await user?.getIdToken()
        const response = await axios.get(`${API_URL}/friends?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${idToken}` },
        })
        return response.data
    }

    const sendFriendRequest = async (friendUserName: string) => {
        const idToken = await user?.getIdToken()
        const response = await axios.post(
            `${API_URL}/friends/request`,
            { friendUserName },
            {
                headers: { Authorization: `Bearer ${idToken}` },
            }
        )
        return response.data
    }

    const respondToFriendRequest = async ({
        requestId,
        action,
    }: {
        requestId: string
        action: "accept" | "reject"
    }) => {
        const idToken = await user?.getIdToken()
        const response = await axios.post(
            `${API_URL}/friends/respond`,
            { requestId, action },
            {
                headers: { Authorization: `Bearer ${idToken}` },
            }
        )
        return response.data
    }

    const removeFriend = async (friendUserName: string) => {
        const idToken = await user?.getIdToken()
        const response = await axios.post(
            `${API_URL}/friends/remove`,
            { friendUserName },
            {
                headers: { Authorization: `Bearer ${idToken}` },
            }
        )
        return response.data
    }

    const getPendingRequests = async ({page, limit}: {page: number, limit: number}) => {
        const idToken = await user?.getIdToken()
        const response = await axios.get(`${API_URL}/friends/requests?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${idToken}` },
        })
        return response.data
    }

    // New function to get friend data
    const getFriendData = async (username: string) => {
        const idToken = await user?.getIdToken()
        const response = await axios.get(
            `${API_URL}/friends/data/${username}`,
            {
                headers: { Authorization: `Bearer ${idToken}` },
            }
        )
        return response.data
    }

    return {
        useGetFriends: ({page, limit}: {page: number, limit: number}) =>
            useQuery({
                queryKey: ["friends"],
                queryFn: () => getFriends({page, limit}),
            }),
        useSendFriendRequest: () =>
            useMutation({
                mutationFn: sendFriendRequest,
                onSuccess: () =>
                    queryClient.invalidateQueries({ queryKey: ["friends"] }),
            }),
        useRespondToFriendRequest: () =>
            useMutation({
                mutationFn: respondToFriendRequest,
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ["friends"] })
                    queryClient.invalidateQueries({
                        queryKey: ["friendRequests"],
                    })
                },
            }),
        useRemoveFriend: () =>
            useMutation({
                mutationFn: removeFriend,
                onSuccess: () =>
                    queryClient.invalidateQueries({ queryKey: ["friends"] }),
            }),
        useGetPendingRequests: ({page, limit}: {page: number, limit: number}) =>
            useQuery({
                queryKey: ["friendRequests"],
                queryFn: () => getPendingRequests({page, limit}),
            }),
        useGetFriendData: (username: string) =>
            useQuery({
                queryKey: ["friendData", username],
                queryFn: () => getFriendData(username),
                enabled: !!username && !!user,
            }),
    }
}

const getFriendTopMovies = async (
    idToken: string
): Promise<FriendMoviesResponse[]> => {
    const response = await axios.get(`${API_URL}/friends/top-movies`, {
        headers: { Authorization: `Bearer ${idToken}` },
    })
    return response.data
}

export function useFriendTopMovies() {
    const { user } = useAuth()

    return useQuery({
        queryKey: ["friendTopMovies"],
        queryFn: async () => {
            const idToken = await user?.getIdToken()
            if (!idToken) throw new Error("No user token available")
            return getFriendTopMovies(idToken)
        },
        enabled: !!user,
    })
}
