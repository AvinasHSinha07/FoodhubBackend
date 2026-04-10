import status from 'http-status';
import { prisma } from '../../lib/prisma';
import AppError from '../../errorHelpers/AppError';
const getAllUsers = async (filters) => {
    const { searchTerm, ...filterData } = filters;
    const conditions = [];
    if (searchTerm) {
        conditions.push({
            OR: ['name', 'email'].map((field) => ({
                [field]: {
                    contains: searchTerm,
                    mode: 'insensitive',
                },
            })),
        });
    }
    // Filter only ACTIVE & non-deleted users for general search
    conditions.push({ isDeleted: false });
    if (Object.keys(filterData).length > 0) {
        conditions.push({
            AND: Object.keys(filterData).map((key) => ({
                [key]: {
                    equals: filterData[key],
                },
            })),
        });
    }
    const result = await prisma.user.findMany({
        where: conditions.length > 0 ? { AND: conditions } : {},
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            image: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    return result;
};
const getMyProfile = async (userEmail) => {
    const user = await prisma.user.findUnique({
        where: {
            email: userEmail,
            isDeleted: false,
        },
        include: {
            providerProfile: true, // Includes provider specifics if they are a Provider
        }
    });
    if (!user) {
        throw new AppError(status.NOT_FOUND, 'User profile not found!');
    }
    // Remove sensitive internals
    const { deletedAt, needPasswordChange, ...userProfile } = user;
    return userProfile;
};
const updateMyProfile = async (userEmail, payload) => {
    const user = await prisma.user.findUnique({
        where: {
            email: userEmail,
            isDeleted: false,
        },
    });
    if (!user) {
        throw new AppError(status.NOT_FOUND, 'User not found to update!');
    }
    const result = await prisma.user.update({
        where: { email: userEmail },
        data: payload,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            image: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    return result;
};
const updateUserStatus = async (userId, userStatus) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw new AppError(status.NOT_FOUND, 'User not found to update status!');
    }
    const result = await prisma.user.update({
        where: { id: userId },
        data: { status: userStatus },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            image: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    return result;
};
export const UserServices = {
    getAllUsers,
    getMyProfile,
    updateMyProfile,
    updateUserStatus,
};
