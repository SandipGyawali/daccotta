import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "react-toastify"
import { useSearchUsers } from "@/services/userService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { z } from "zod"
import { useAuth } from "@/hooks/useAuth"
import { useFriends } from "@/services/friendsService"
import { useNavigate } from "react-router-dom"
import { AxiosError } from "axios"
import { Users, Trash, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight} from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination"

const searchSchema = z
    .string()
    .min(3, "Search term must be at least 3 characters long")

const FriendsSearch: React.FC = () => {
    const [activeTab, setActiveTab] = useState<"all" | "pending" | "add">("all")
    const [searchTerm, setSearchTerm] = useState("")
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
    const [friendToRemove, setFriendToRemove] = useState("")
    const [pagination, setPagination] = useState<{
        page: number;
        limit: number;
        totalPages: number;
    }>({
        page: 1, 
        limit: 5,
        totalPages: 1
    });
    const { user } = useAuth()
    const navigate = useNavigate()

    const {
        useGetFriends,
        useSendFriendRequest,
        useRespondToFriendRequest,
        useRemoveFriend,
        useGetPendingRequests,
    } = useFriends()
    const [friendRequestStatus, setFriendRequestStatus] = useState<{ [key: string]: { loading: boolean; sent: boolean } }>({});
    const [requestLoading, setRequestLoading] = useState<{ [key: string]: { accept: boolean; reject: boolean } }>({});
    const { data: friends, isLoading: isLoadingFriends, refetch: refetchFriends } = useGetFriends({page: pagination.page, limit: pagination.limit})
    const { data: pendingRequests, isLoading: isLoadingRequests, refetch: refetchPendingRequests } =
        useGetPendingRequests({page: pagination.page, limit: pagination.limit})
    const {
        data: searchResults,
        isLoading: isLoadingSearch,
        refetch: refetchSearch,
    } = useSearchUsers(searchTerm, user?.uid)

    const sendFriendRequestMutation = useSendFriendRequest()
    const respondToFriendRequestMutation = useRespondToFriendRequest()
    const removeFriendMutation = useRemoveFriend()
    const [removeLoading, setRemoveLoading] = useState(false);


    useEffect(() => {
        if(activeTab === "pending") {
            refetchPendingRequests();
        } else{
            refetchFriends();
        }
    }, [pagination])

    const handleSearch = () => {
        try {
            searchSchema.parse(searchTerm)
            refetchSearch()
        } catch (error) {
            if (error instanceof z.ZodError) {
                toast.error(error.errors[0].message)
            }
        }
    }

    const handleSendRequest = (friendUserName: string) => {
        if (friendRequestStatus[friendUserName]?.sent) return; // Prevent duplicate requests

        setFriendRequestStatus((prev) => ({
            ...prev,
            [friendUserName]: { loading: true, sent: false }
        }));

        sendFriendRequestMutation.mutate(friendUserName, {
            onSuccess: () => {
                setFriendRequestStatus((prev) => ({
                    ...prev,
                    [friendUserName]: { loading: false, sent: true }
                }));
                toast.success("Friend request sent successfully.");
            },
            onError: (error) => {
                const axiosError = error as AxiosError;
                const message: any = axiosError.response?.data;
                toast.warn(message.message);
                setFriendRequestStatus((prev) => ({
                    ...prev,
                    [friendUserName]: { loading: false, sent: false }
                }));
            }
        });
    };


    const handleRespondToRequest = (requestId: string, action: "accept" | "reject") => {
        setRequestLoading((prev) => ({
            ...prev,
            [requestId]: { ...prev[requestId], [action]: true }
        })); // Set loading only for the specific action on this request

        respondToFriendRequestMutation.mutate(
            { requestId, action },
            {
                onSuccess: () => {
                    toast.success(`Friend request ${action}ed successfully.`);
                },
                onError: () => {
                    toast.error(`Failed to ${action} friend request. Please try again.`);
                },
                onSettled: () => {
                    setRequestLoading((prev) => ({
                        ...prev,
                        [requestId]: { ...prev[requestId], [action]: false }
                    })); // Reset loading state after the action completes
                },
            }
        );
    };


    const handleRemoveFriend = () => {
        setRemoveLoading(true);
        removeFriendMutation.mutate(friendToRemove, {
            onSuccess: () => {
                toast.success("Friend removed successfully.")
                setIsRemoveDialogOpen(false)
            },
            onError: () => {
                toast.error("Failed to remove friend. Please try again.")
            },
            onSettled: () => {
                setRemoveLoading(false); // Stop loading after the process completes
            },
        })
    }

    const handleUserClick = (username: string) => {
        navigate(`/user/${username}`)
    }

    // pagination section methods and variables
    const _limit = [5, 15, 25, 50, 75];

    const handleLimitSelect = (limit: number) => {
        setPagination(prev => ({
            ...prev,
            limit
        }));
    }

    return (
        <div className="min-h-screen pt-[5rem] md:pt[5rem] lg:pt-[5rem] max-h-screen overflow-auto scrollbar-hide text-gray-100 lg:p-4 px-[4rem] w-full">
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-wrap items-center justify-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        <h1 className="text-2xl font-bold">Friends</h1>
                    </div>
                    <nav className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            className={`text-gray-300 rounded-md hover:text-white hover:bg-gray-800 ${activeTab === "all" ? "bg-gray-800" : ""}`}
                            onClick={() => setActiveTab("all")}
                        >
                            All
                        </Button>
                        <Button
                            variant="ghost"
                            className={`relative text-gray-300 hover:text-white hover:bg-gray-800 ${activeTab === "pending" ? "bg-gray-800" : ""}`}
                            onClick={() => setActiveTab("pending")}
                        >
                            Pending
                            {pendingRequests?.length > 0 && (
                                <span className="absolute top-1 -m-1 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                                    {pendingRequests.length}
                                </span>
                            )}
                        </Button>

                        <Button
                            className={`bg-green-600 hover:bg-green-700 ${activeTab === "add" ? "bg-green-700" : ""}`}
                            onClick={() => setActiveTab("add")}
                        >
                            Add Friend
                        </Button>
                    </nav>
                </header>
                <AnimatePresence mode="wait">
                    {activeTab === "all" && (
                        <motion.section
                            key="all-friends"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="text-lg font-semibold mb-4">
                                    ALL FRIENDS — {friends?.length || 0}
                                </h2>
                                {/* limit drop down */}
                                <div>
                                    <DropdownMenu>
                                        <DropdownMenuLabel>Row:</DropdownMenuLabel>
                                        <DropdownMenuTrigger asChild>
                                            <Button className="w-fit bg-gray-800 text-white hover:bg-gray-700">
                                                {pagination.limit || "Row Limit"}
                                                <ChevronDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="max-h-[300px] overflow-y-auto bg-gray-800 text-white">
                                            {
                                                _limit.map((lim, index) => (
                                                    <DropdownMenuItem
                                                        key={`${lim}-${index}`}
                                                        onClick={() => handleLimitSelect(lim)}
                                                    >
                                                        {lim}
                                                    </DropdownMenuItem>
                                                ))
                                            }
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            {isLoadingFriends ? (
                                <p>Loading friends...</p>
                            ) : (
                                <>
                                <ul className="space-y-4">
                                    {friends?.friends?.map((friend: string) => (
                                        <motion.li
                                            key={friend}
                                            className="flex items-center justify-between bg-gray-800 p-3 rounded-lg overflow-hidden cursor-pointer transition-colors hover:bg-gray-700"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <div
                                                className="flex items-center gap-3 button cursor-pointer"
                                                onClick={() =>
                                                    handleUserClick(friend)
                                                }
                                            >
                                                <Avatar>
                                                    <AvatarImage
                                                        src={`/api/avatar/${friend}`}
                                                        alt={friend}
                                                    />
                                                    <AvatarFallback>
                                                        {friend
                                                            .substring(0, 2)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-semibold">
                                                        {friend}
                                                    </h3>
                                                    <p className="text-sm text-gray-400">
                                                        Online
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="icon"
                                                    onClick={() => {
                                                        setFriendToRemove(
                                                            friend
                                                        )
                                                        setIsRemoveDialogOpen(
                                                            true
                                                        )
                                                    }}
                                                >
                                                    <Trash className="h-5 w-5" />
                                                </Button>
                                            </div>
                                        </motion.li>
                                    ))}
                                </ul>
                                {
                                    friends.friends.length > 0 && (
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <Button 
                                                        onClick={() => (
                                                            setPagination((prev) => ({
                                                                ...prev,
                                                                page: prev.page - 1
                                                            }))
                                                        )}
                                                        disabled={pagination.page === 1}
                                                    >
                                                        <ChevronLeft className="w-5 h-5"/>
                                                        Previous
                                                    </Button>
                                                </PaginationItem>
                                                <PaginationItem>
                                                    <Button 
                                                        onClick={() => 
                                                            setPagination((prev) => ({
                                                                ...prev,
                                                                page: prev.page + 1
                                                            }))
                                                        }   
                                                        disabled={pagination.totalPages === pagination.page}     
                                                    >
                                                        Next
                                                        <ChevronRight className="w-5 h-5"/>
                                                    </Button>
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    )
                                }
                                </>
                            )}
                        </motion.section>
                    )}

                    {activeTab === "pending" && (
                        <motion.section
                            key="pending-requests"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="text-lg font-semibold mb-4">
                                    PENDING REQUESTS —{" "}
                                    {pendingRequests?.length || 0}
                                </h2>
                                {/* limit drop down */}
                                <div>
                                    <DropdownMenu>
                                        <DropdownMenuLabel>Row:</DropdownMenuLabel>
                                        <DropdownMenuTrigger asChild>
                                            <Button className="w-fit bg-gray-800 text-white hover:bg-gray-700">
                                                {pagination.limit || "Row Limit"}
                                                <ChevronDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="max-h-[300px] overflow-y-auto bg-gray-800 text-white">
                                            {
                                                _limit.map((lim, index) => (
                                                    <DropdownMenuItem
                                                        key={`${lim}-${index}`}
                                                        onClick={() => handleLimitSelect(lim)}
                                                    >
                                                        {lim}
                                                    </DropdownMenuItem>
                                                ))
                                            }
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            {isLoadingRequests ? (
                                <p>Loading requests...</p>
                            ) : (
                                <>
                                <ul className="space-y-4">
                                    {pendingRequests?.pendingRequests?.map((request: any) => (
                                        <motion.li
                                            key={request._id}
                                            className="flex flex-col items-start justify-between bg-gray-800 p-3 rounded-lg overflow-hidden cursor-pointer transition-colors hover:bg-gray-700 md:flex-row md:items-center"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <div className="flex items-center gap-3 w-full md:w-auto">
                                                <Avatar>
                                                    <AvatarImage
                                                        src={`/api/avatar/${request.from}`}
                                                        alt={request.from}
                                                    />
                                                    <AvatarFallback>
                                                        {request.from.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-semibold text-base md:text-lg">{request.from}</h3>
                                                    <p className="text-xs text-gray-400 md:text-sm">Incoming Request</p>
                                                </div>
                                            </div>
                                            <div className="space-y-2 mt-3 md:mt-0 md:space-y-0 md:space-x-2 w-full md:w-auto flex flex-col md:flex-row">
                                                <Button
                                                    onClick={() => handleRespondToRequest(request._id, "accept")}
                                                    variant="default"
                                                    size="sm"
                                                    disabled={requestLoading[request._id]?.accept} // Disable during accept loading
                                                >
                                                    {requestLoading[request._id]?.accept ? "Accepting..." : "Accept"}
                                                </Button>
                                                <Button
                                                    onClick={() => handleRespondToRequest(request._id, "reject")}
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={requestLoading[request._id]?.reject} // Disable during reject loading
                                                >
                                                    {requestLoading[request._id]?.reject ? "Rejecting..." : "Reject"}
                                                </Button>
                                            </div>
                                        </motion.li>
                                    ))}
                                </ul>
                                {
                                    pendingRequests.length > 0 && (
                                        <Pagination>
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <Button 
                                                        onClick={() => (
                                                            setPagination((prev) => ({
                                                                ...prev,
                                                                page: prev.page - 1
                                                            }))
                                                        )}
                                                        disabled={pagination.page === 1}
                                                    >
                                                        <ChevronLeft className="w-5 h-5"/>
                                                        Previous
                                                    </Button>
                                                </PaginationItem>
                                                <PaginationItem>
                                                    <Button 
                                                        onClick={() => 
                                                            setPagination((prev) => ({
                                                                ...prev,
                                                                page: prev.page + 1
                                                            }))
                                                        }   
                                                        disabled={pagination.totalPages === pagination.page}     
                                                    >
                                                        Next
                                                        <ChevronRight className="w-5 h-5"/>
                                                    </Button>
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    )
                                }
                                </>
                            )}
                        </motion.section>
                    )}

                    {activeTab === "add" && (
                        <motion.section
                            key="add-friend"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h2 className="text-lg font-semibold mb-4">
                                ADD FRIEND
                            </h2>
                            <div className="flex space-x-2 mb-4">
                                <Input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="bg-gray-800 border-gray-700 focus:border-gray-600"
                                />
                                <Button onClick={handleSearch}>Search</Button>
                            </div>
                            {isLoadingSearch ? (
                                <p>Searching...</p>
                            ) : (
                                <ul className="space-y-4">
                                    {searchResults?.map((user: any) => (
                                        <motion.li
                                            key={user.uid}
                                            className="flex items-center justify-between bg-gray-800 p-3 rounded-lg overflow-hidden cursor-pointer transition-colors hover:bg-gray-700"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <div
                                                className="flex items-center gap-3"
                                                onClick={() =>
                                                    handleUserClick(
                                                        user.userName
                                                    )
                                                }
                                            >
                                                <Avatar>
                                                    <AvatarImage
                                                        src={`/api/avatar/${user.userName}`}
                                                        alt={user.userName}
                                                    />
                                                    <AvatarFallback>
                                                        {user.userName
                                                            .substring(0, 2)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-semibold">
                                                        {user.userName}
                                                    </h3>
                                                    <p className="text-sm text-gray-400">
                                                        User
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => handleSendRequest(user.userName)}
                                                disabled={friendRequestStatus[user.userName]?.loading || friendRequestStatus[user.userName]?.sent}
                                                size="sm"
                                                className="p-2 sm:p-3 md:p-4 lg:p-5 rounded-md"
                                                aria-label="Send Friend Request"
                                            >
                                                {friendRequestStatus[user.userName]?.loading ? "Sending..." : friendRequestStatus[user.userName]?.sent ? "Sent" : "Send Request"}
                                        </Button>
                                        </motion.li>
                                    ))}
                                </ul>
                            )}
                        </motion.section>
                    )}
                </AnimatePresence>
            </div>

            <Dialog
                open={isRemoveDialogOpen}
                onOpenChange={setIsRemoveDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-white" />
                            Remove Friends
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p>
                            Are you sure you want to remove this friend? This
                            action cannot be undone.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            className="bg-white text-black"
                            onClick={() => setIsRemoveDialogOpen(false)}
                            disabled={removeLoading} // Disable Cancel button during loading
                        >
                            {removeLoading ? "Please wait..." : "Cancel"}
                        </Button>
                        <Button onClick={handleRemoveFriend} disabled={removeLoading}>
                            {removeLoading ? "Removing..." : "Remove Friend"}
                        </Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default FriendsSearch
