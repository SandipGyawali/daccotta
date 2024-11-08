import type { Request, Response, NextFunction } from "express"
import User, { FriendRequest } from "../models/User"

/**
 * 
 * @param req 
 * @param res 
 * @param next 
 * @returns list of friends based on specific id.
 */
export const getFriends = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query['page'] as string, 10);
        const limit = parseInt(req.query['limit'] as string, 10);        
        if (isNaN(page) || isNaN(limit) || page <= 0 || limit <= 0) {
            return res.status(400).json({ message: "Invalid query params for pagination" });
        }

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const result = await User.aggregate([
            { $match: { _id: req.user?.uid } },
            { $project: { friends: 1 } },
            { $unwind: "$friends" },
            {
                $facet: {
                    data: [
                        { $skip: startIndex }, // Skip documents based on pagination
                        { $limit: endIndex }, // Limit to the specified page size
                        { $group: { _id: "$_id", friends: { $push: "$friends" } } } // Reassemble friends array after pagination
                    ],
                    meta: [
                        { $count: "totalCount" } // Get the total count of friends
                    ]
                }
            }
        ]);

        const friendsData = result[0]?.data[0]?.friends || [];
        const totalCount = result[0]?.meta[0]?.totalCount || 0;
        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({
            friends: friendsData,
            meta: {
                totalCount,
                limit: limit,
                totalPages
            }
        })
    } catch (error) {
        next(error)
    }
}

/**
 * 
 * @param req 
 * @param res 
 * @param next 
 * @returns list of friend requests
 */
export const getAllFriendRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query['page'] as string);
        const limit = parseInt(req.query['limit'] as string);
        if(isNaN(page) || isNaN(limit) || page <= 0 || limit <= 0) {
            return res.status(400).json({message: "Invalid query params for pagination"});
        }

        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const result = await FriendRequest.aggregate([
            {
                $match: {
                    id: req.user?.uid,
                    status: "pending"
                }
            },
            {
                $facet: {
                    meta: [{ $count: "totalCount" }], // Count total pending friend requests
                    data: [
                        { $skip: startIndex }, // Skip documents based on pagination
                        { $limit: limit }, // Limit to the specified page size
                    ]
                }
            }
        ]);

        const pendingRequests = result[0]?.data || [];
        const totalCount = result[0]?.meta[0]?.totalCount || 0;
        const totalPages = Math.ceil(totalCount / limit);

        res.status(200).json({
            pendingRequests,
            meta: {
                totalCount,
                limit,
                totalPages,
            }
        });

    } catch (error) {
        next(error)
    }
}

export const getFriendTopMovies = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const currentUser = await User.findById(req.user?.uid)

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" })
        }

        const friendsTopMovies = await Promise.all(
            currentUser.friends.map(async (friendUserName) => {
                const friendUser = await User.findOne({
                    userName: friendUserName,
                })
                if (!friendUser) {
                    return null
                }

                const topMoviesList = friendUser.lists.find(
                    (list) => list.name === "Top 5 Movies"
                )

                if (!topMoviesList) {
                    return null
                }

                return {
                    friend: friendUserName,
                    movies: topMoviesList.movies,
                }
            })
        )

        // Filter out any null results (friends not found or without top movies list)
        const validFriendsTopMovies = friendsTopMovies.filter(
            (item) => item !== null
        )

        res.status(200).json(validFriendsTopMovies)
    } catch (error) {
        next(error)
    }
}
