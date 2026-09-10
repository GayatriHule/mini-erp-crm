import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser, Role } from '../types';
export interface AuthedRequest extends Request { user?: AuthUser }
export function requireAuth(req:AuthedRequest,res:Response,next:NextFunction){
  const token=req.headers.authorization?.startsWith('Bearer ')?req.headers.authorization.slice(7):undefined;
  if(!token) return res.status(401).json({message:'Authentication required'});
  try{ req.user=jwt.verify(token,process.env.JWT_SECRET!) as AuthUser; next(); }
  catch{ return res.status(401).json({message:'Invalid or expired token'}); }
}
export function requireRoles(...roles:Role[]){ return (req:AuthedRequest,res:Response,next:NextFunction)=>{ if(!req.user || !roles.includes(req.user.role)) return res.status(403).json({message:'You do not have permission for this action'}); next(); }; }
