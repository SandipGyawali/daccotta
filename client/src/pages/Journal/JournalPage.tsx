import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { CalendarIcon, Plus, EllipsisVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { useJournal } from "@/services/journalService"
import { SimpleMovie } from "@/Types/Movie"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { searchMovies } from "@/services/movieService"
import { toast } from "react-toastify"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import Stars from '../../components/ui/stars'; // Adjust the path as necessary

interface AxiosError {
    response?: {
        data: {
            error: string
        }
    }
    message: string
}
const JournalPage: React.FC = () => {
    const { useGetJournalEntries, useAddJournalEntry, useDeleteJournalEntry, useEditJournalEntry } =
        useJournal()
    const { data: journalEntries, isLoading } = useGetJournalEntries()
    const addJournalEntry = useAddJournalEntry()
    const deleteJournalEntry = useDeleteJournalEntry()
    const editJournalEntry = useEditJournalEntry()

    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<SimpleMovie[]>([])
    const [selectedMovie, setSelectedMovie] = useState<SimpleMovie | null>(null)
    const [dateWatched, setDateWatched] = useState<Date | undefined>(new Date())
    const [rewatches, setRewatches] = useState(1)
    const [isAddingEntry, setIsAddingEntry] = useState(false)
    const [hoveredEntry, setHoveredEntry] = useState<string | null>(null)
    const [rating, setRating] = useState<number | null>(null); // State for rating

    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null)
    const [entryToEdit, setEntryToEdit] = useState<string | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const [filterDate, setFilterDate] = useState<Date | undefined>(undefined)

    const handleDeleteEntry = async () => {
        if (!entryToDelete) return

        try {
            await deleteJournalEntry.mutateAsync(entryToDelete)
            setIsDeleteDialogOpen(false)
            setEntryToDelete(null)
            toast.success("Journal entry deleted successfully")
        } catch (error) {
            console.error("Error deleting journal entry:", error)
            toast.error("Failed to delete journal entry. Please try again.")
        }
    }

    const handleEditEntry = async () => {
        handleAddEntry();
    }

    const handleOpenDeleteDialog = (
        entryId: string,
        event: React.MouseEvent
    ) => {
        event.stopPropagation() // Prevent the click from propagating to the parent div
        setEntryToDelete(entryId)
        setEntryToEdit(entryId)
        setIsDeleteDialogOpen(true)
    }

    const handleAddEntry = async () => {
        if (!selectedMovie) {
            toast.error("Please select a movie to add to the journal.")
            return
        }
        if(!dateWatched) {
            toast.error("Please pick up a date to add to the journal.")
            return
        }
        setLoading(true) // Show loading spinner while sending
        try {
            await addJournalEntry.mutateAsync({
                movie: {
                    movie_id: selectedMovie.id,
                    id: selectedMovie.id,
                    title: selectedMovie.title,
                    poster_path: selectedMovie.poster_path,
                    release_date: selectedMovie.release_date,
                    genre_ids: selectedMovie.genre_ids,
                },
                rating: rating ?? 0,
                dateWatched,
                rewatches,
            })

            setIsAddingEntry(false)
            setSelectedMovie(null)
            setDateWatched(new Date())
            setRewatches(1)
            setRating(0)
            toast.success(
                `"${selectedMovie.title}" has been added to your journal.`
            )
        } catch (error: unknown) {
            // Use type assertion to treat error as AxiosError
            const axiosError = error as AxiosError

            if (axiosError.response) {
                console.error(
                    "Error adding journal entry:",
                    axiosError.response.data.error
                )
                if (
                    axiosError.response.data.error ===
                    "Duplicate entry for same day"
                ) {
                    toast.error(
                        "Failed to add journal entry: " +
                            axiosError.response.data.error
                    )
                }
            } else if (axiosError instanceof Error) {
                console.error("Error message:", axiosError.message)
                toast.error(
                    "Failed to add journal entry: " + axiosError.message
                )
            } else {
                console.error("Unknown error:", error)
            }
        } finally {
            setLoading(false) // Hide loader after request
        }
    }

    const handleSearchMovie = async () => {
        if (searchQuery.length >= 3) {
            const results = await searchMovies(searchQuery)
            setSearchResults(results)
        } else {
            setSearchResults([])
        }
    }

    const handleSelectMovie = (movie: SimpleMovie) => {
        setSelectedMovie(movie)
        setSearchResults([])
        setSearchQuery("")
    }

    const handleClick = (_id: string) => {
        console.log("handle click fired", _id)
        navigate(`/movie/${_id}`)
    }

    const sortedEntries = useMemo(() => {
        if (!journalEntries) return [];

        const selectedMonth = filterDate ? filterDate.getMonth() : null;
        const selectedYear = filterDate ? filterDate.getFullYear() : null;

        const filteredEntries = journalEntries.filter(entry => {
            const watchedDate = new Date(entry.dateWatched);
            const entryMonth = watchedDate.getMonth();
            const entryYear = watchedDate.getFullYear();

            return (
                (selectedMonth === null || entryMonth === selectedMonth) &&
                (selectedYear === null || entryYear === selectedYear)
            );
        });

        const sorted = [...filteredEntries].sort(
            (a, b) =>
                new Date(b.dateWatched).getTime() -
                new Date(a.dateWatched).getTime()
        );

        const groupedByMonth:any = {};
        sorted.forEach((entry) => {
            const monthYear = format(new Date(entry.dateWatched), "MMMM yyyy");
            if (!groupedByMonth[monthYear]) {
                groupedByMonth[monthYear] = [];
            }
            groupedByMonth[monthYear].push(entry);
        });

        return groupedByMonth;
    }, [journalEntries, filterDate]);


    if (isLoading) {
        return (
            <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-gray-900 bg-opacity-50 z-50">
                <div className="border-4 border-white border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
            </div>
        )
    }

    return (
        <div
            className="min-h-screen text-white p-8 max-h-screen overflow-auto scrollbar-hide w-full"
            style={{ backgroundColor: "black" }}
        >
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between w-full items-center mb-6">
                    <h1 className="text-4xl font-bold">My Movie Journal</h1>
                    <div className="flex items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <div className="flex items-center p-2">
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !filterDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterDate ? (
                                        format(filterDate, "MMMM yyyy")
                                    ) : (
                                        <span>filter</span>
                                    )}
                                </Button>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-68 p-0" align="start">
                            <div className="flex flex-col p-4">
                                <Calendar
                                    mode="single"
                                    selected={filterDate}
                                    onSelect={(date) => {
                                        setFilterDate(date);
                                    }}
                                    initialFocus
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => setFilterDate(undefined)}
                                    className="mt-2 w-full text-red-500"
                                >
                                    Clear
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>


                    <Dialog
                        open={isAddingEntry}
                        onOpenChange={setIsAddingEntry}
                    >
                        <DialogTrigger asChild>
                            <Button
                                size="icon"
                                variant="outline"
                                className="rounded-full w-10 h-10 text-white"
                            >
                                <Plus className="h-6 w-6" />
                                <span className="sr-only">
                                    Add journal entry
                                </span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className=" xs:w-[400px] sm:max-w-[400px] max-w-[400px]">
                            <DialogHeader>
                                <DialogTitle className="text-2xl text-white font-bold">
                                    Add New Journal Entry
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    {/* <Label
                                        htmlFor="movie-search"
                                        className="text-sm font-medium"
                                    >
                                        Search Movie
                                    </Label> */}
                                    <div className="flex space-x-2">
                                        <Input
                                            id="movie-search"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value)
                                                handleSearchMovie()
                                            }}
                                            placeholder="Enter movie title"
                                            className="flex-grow text-white"
                                        />
                                        {/* <Button
                                            onClick={handleSearchMovie}
                                            className="shrink-0"
                                        >
                                            Search
                                        </Button> */}
                                    </div>
                                    {searchResults.length > 0 && (
                                        <ul className="mt-2 border rounded-md max-h-40 overflow-y-auto bg-white">
                                            {searchResults.map((movie) => (
                                                <li
                                                    key={movie.id}
                                                    className="p-2 hover:bg-muted cursor-pointer transition-colors"
                                                    onClick={() =>
                                                        handleSelectMovie(movie)
                                                    }
                                                >
                                                    {movie.title} (
                                                    {
                                                        movie.release_date?.split(
                                                            "-"
                                                        )[0]
                                                    }
                                                    )
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                {selectedMovie && (
                                    <div className="p-4 bg-muted rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <img
                                                src={`https://image.tmdb.org/t/p/w92${selectedMovie.poster_path}`}
                                                alt={selectedMovie.title}
                                                className="w-10 h-auto rounded"
                                            />
                                            <div className="flex flex-row">
                                                <h3 className="font-semibold mb-2">
                                                    {/* Selected Movie:{" "} */}
                                                    {selectedMovie.title}
                                                    <p className="text-sm text-muted-foreground">
                                                        {/* Release Year:{" "} */}
                                                        {
                                                            selectedMovie.release_date?.split(
                                                                "-"
                                                            )[0]
                                                        }
                                                    </p>
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div>
                                <h2 className="text-lg font-semibold text-white">Rate this movie:</h2>
                                    <Stars rating={rating} onRatingChange={setRating} />
                                    <p className="mt-2 text-white">
                                        Your Rating: {rating ? rating : 'Not rated yet'}
                                    </p>
                                </div>
                                <div className="space-y-2 text-gray-300">
                                    <Label
                                        htmlFor="rewatches"
                                        className="text-sm   font-medium"
                                    >
                                        Times Watched
                                    </Label>
                                    <Input
                                        id="rewatches"
                                        type="number"
                                        value={rewatches}
                                        onChange={(e) =>
                                            setRewatches(
                                                parseInt(e.target.value)
                                            )
                                        }
                                        min={1}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-gray-300 font-medium">
                                        Date Watched
                                    </Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full justify-start text-left font-normal",
                                                    !dateWatched &&
                                                        "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {dateWatched ? (
                                                    format(dateWatched, "PPP")
                                                ) : (
                                                    <span>Pick a date</span>
                                                )}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent
                                            className="w-auto p-0"
                                            align="start"
                                        >
                                            <Calendar
                                                mode="single"
                                                selected={dateWatched}
                                                onSelect={setDateWatched}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <Button
                                    disabled={loading}
                                    onClick={handleAddEntry}
                                    className="w-full"
                                >
                                    {loading ? "Adding..." : "Add"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    </div>
                </div>
                {Object.entries(sortedEntries).map(([monthYear, entries]) => (
                    <div key={monthYear} className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">
                            {monthYear}
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {entries.map((entry) => (
                                <div
                                    key={entry._id}
                                    className="relative w-full h-full group"
                                    onMouseEnter={() =>
                                        setHoveredEntry(entry._id)
                                    }
                                    onMouseLeave={() => setHoveredEntry(null)}
                                >
                                    <img
                                        src={`https://image.tmdb.org/t/p/w500${entry.movie.poster_path}`}
                                        alt={`${entry.movie.title} poster`}
                                        className="w-full h-full rounded-lg shadow-lg cursor-pointer"
                                        onClick={() =>
                                            handleClick(entry.movie.movie_id)
                                        }
                                    />

                                    <motion.div
                                        className={`absolute inset-0 bg-gradient-to-t from-black to-transparent flex flex-col justify-end p-4 transition-opacity duration-300
                                ${hoveredEntry === entry._id ? "opacity-100" : "opacity-100 md:opacity-0 group-hover:opacity-100"}`}
                                    >
                                        <h3 className="text-lg font-bold">
                                            {entry.movie.title}
                                        </h3>
                                        <p className="text-sm text-gray-300">
                                            Watched:{" "}
                                            {format(
                                                new Date(entry.dateWatched),
                                                "PPP"
                                            )}
                                        </p>
                                        <p className="text-sm text-gray-300">
                                            Times Watched: {entry.rewatches}
                                        </p>
                                        <p className="text-sm text-gray-300">
                                           Rating: {entry.rating}
                                        </p>

                                        {/* Delete button visible on hover for desktop, always visible on mobile */}
                                        <Button
                                            size="icon"
                                            className="absolute top-2 right-2 bg-transparent pointer-events-auto
                                    opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                            onClick={(e) =>
                                                handleOpenDeleteDialog(
                                                    entry._id,
                                                    e
                                                )
                                            }
                                        >
                                            <EllipsisVertical className="h-4 w-4" />
                                        </Button>
                                    </motion.div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <Card className="overflow-hidden border-dashed w-[200px]">
                    <CardContent className="p-0 flex items-center justify-center h-[300px]">
                        <div
                            className="text-center p-4 cursor-pointer"
                            onClick={() => setIsAddingEntry(true)}
                        >
                            <Plus className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Add Journal Entry
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Dialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle></DialogTitle>
                    </DialogHeader>
                    <p className="text-white">
                        Update Your Journal Entry
                    </p>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="text-white"
                            onClick={() => {setIsDeleteDialogOpen(false); setIsEditDialogOpen(true);}}
                        >Edit
                        </Button>
                        <Button
                            variant="outline"
                            className="text-white"
                            onClick={() => setIsDeleteDialogOpen(false)}
                        >Cancel
                        </Button>
                        <Button
                            variant="outline"
                            className="bg-red-800 text-white"
                            onClick={handleDeleteEntry}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
            >
                <DialogContent>
                <p className="text-white">
                    Edit Your Journal Entry
                </p>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="text-white"
                            onClick={() => setIsEditDialogOpen(false)}
                        >Cancel
                        </Button>
                        <Button
                            variant="outline"
                            className="bg-green-800 text-white"
                            onClick={handleEditEntry}
                        > Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default JournalPage
