import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import Logger from '../utils/logger';

export const getPosts = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    Logger.info(`Retrieved ${posts.length} posts`);
    res.json({ posts });
  } catch (error) {
    Logger.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

export const createPost = async (req: Request, res: Response) => {
  try {
    const { title, content, published, authorId } = req.body;

    // Basic validation
    if (!title || !authorId) {
      return res.status(400).json({ error: 'Title and authorId are required' });
    }

    // Check if author exists
    const author = await prisma.user.findUnique({
      where: { id: authorId },
    });

    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published: published || false,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    Logger.info(`Created post: ${post.title}`);
    res.status(201).json({ post });
  } catch (error) {
    Logger.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

export const getPostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post });
  } catch (error) {
    Logger.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

export const updatePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, published } = req.body;

    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(published !== undefined && { published }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    Logger.info(`Updated post: ${post.title}`);
    res.json({ post });
  } catch (error) {
    Logger.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

export const deletePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if post exists
    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await prisma.post.delete({
      where: { id },
    });

    Logger.info(`Deleted post: ${existingPost.title}`);
    res.status(204).send();
  } catch (error) {
    Logger.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};
