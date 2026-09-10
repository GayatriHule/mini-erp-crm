import { Request, Response, NextFunction } from 'express';
export function notFound(_req:Request,res:Response){res.status(404).json({message:'Route not found'});}
export function errorHandler(err:any,_req:Request,res:Response,_next:NextFunction){ console.error(err); if(err?.code==='23505') return res.status(409).json({message:'A record with the same unique value already exists'}); res.status(err?.status||500).json({message:err?.message||'Internal server error'}); }
