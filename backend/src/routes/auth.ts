import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../db';
const r=Router();
const loginSchema=z.object({email:z.string().email(),password:z.string().min(1)});
r.post('/login',async(req,res,next)=>{try{const b=loginSchema.parse(req.body); const q=await query<any>('SELECT id,name,email,password_hash,role FROM users WHERE email=$1',[b.email.toLowerCase()]); const u=q.rows[0]; if(!u || !(await bcrypt.compare(b.password,u.password_hash))) return res.status(401).json({message:'Invalid email or password'}); const user={id:u.id,name:u.name,email:u.email,role:u.role}; const token=jwt.sign(user,process.env.JWT_SECRET!,{expiresIn:'8h'}); res.json({token,user});}catch(e){next(e)}});
export default r;
