import { Response } from "express";

export const successResponse = (
  res: Response,
  data: any = null,
  message: string = "Success",
  statusCode: number = 200,
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  }
) => {
  const body: Record<string, unknown> = {
    success: true,
    message,
    data
  };

  if (pagination) {
    body.pagination = pagination;
  }

  return res.status(statusCode).json(body);
};

export const errorResponse = (
  res: Response,
  message: string = "An error occurred",
  statusCode: number = 500,
  errors: any = null
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};