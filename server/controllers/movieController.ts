import ListModel from "../models/List"
import { type Request, type Response, Router } from "express"
import { verifyToken } from "../middleware/verifyToken"
import User from "../models/User"

export const addMovie = async (req: Request, res: Response) => {
    try {
        const { listId } = req.params
        const { movie_id, title, poster_path, release_date, genre_ids } =
            req.body
        const userId = req.user?.uid

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" })
        }

        // Find the list
        const list = await ListModel.findOne()
            .where("list_id")
            .equals(listId)

        if (!list) {
            return res.status(404).json({ error: "List not found" })
        }

        // Check if the user is a member of the list
        const isMember = list.members.some(
            (member) => member.user_id === userId
        )
        if (!isMember) {
            return res
                .status(403)
                .json({ error: "You are not a member of this list" })
        }

        // Check if the movie already exists in the list
        const movieExists = list.movies.some(
            (movie) => movie.movie_id === movie_id
        )
        if (movieExists) {
            return res
                .status(400)
                .json({ error: "Movie already exists in the list" })
        }

        // Add the movie to the list
        list.movies.push({
            movie_id,
            title,
            poster_path,
            release_date,
            genre_ids,
        })
        await list.save()

        // Update the user's list
        await User.findByIdAndUpdate(
            userId,
            { $set: { "lists.$[elem]": list } },
            {
                arrayFilters: [{ "elem.list_id": listId }],
                new: true,
            }
        )

        res.status(200).json({
            message: "Movie added to the list successfully",
            list: list,
        })
    } catch (error) {
        console.error("Error adding movie to list:", error)
        res.status(500).json({ error: "Internal server error" })
    }
}


export const removeMovie = async (req: Request, res: Response) => {
    try {
        const { listId } = req.params;
        const { movie_id } = req.body; // Expecting movie_id in request body
        const userId = req.user?.uid;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Update the user's lists to reflect the removal of the movie
        await User.findOneAndUpdate(
            { _id: userId, "lists.list_id": listId },
            { $pull: { "lists.$.movies": { movie_id } } },
            { new: true }
        );

        res.status(200).json({
            message: "Movie removed from the list successfully",
        });
    } catch (error) {
        console.error("Error removing movie from list:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const addMovieInList = async (req: Request, res: Response) => {
    try {
        const { listId } = req.params;
        const { movie_id, title, poster_path, release_date } = req.body; // Expecting movie details in request body
        const userId = req.user?.uid;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Update the user's lists to add the movie
        await User.findOneAndUpdate(
            { _id: userId, "lists.list_id": listId },
            { $addToSet: { "lists.$.movies": { movie_id, title, poster_path, release_date } } }, // Use $addToSet to prevent duplicates
            { new: true }
        );

        res.status(200).json({
            message: "Movie added to the list successfully",
        });
    } catch (error) {
        console.error("Error adding movie to list:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}