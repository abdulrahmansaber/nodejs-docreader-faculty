import { Request, Response } from "express"
import { UserRole } from "@prisma/client"

import { linkSchema, subjectLecture } from "../../schema"
import { badRequest, notFound, send, unauthorized, validationErrors } from "../../utlis/responses"
import { currentDate, extractErrors, parameterExists } from "../../utlis/helpers"

import db, { findLectureUnique, findLinkMany, findLinkUnique, findSubjectUnique } from "../../utlis/db"
import AuthController from "./AuthController"

export default class LectureController {
  
  async get(req: Request, res: Response) {
    try {
      const lectureId = parameterExists(req, res, "lectureId")
      if (!lectureId) return badRequest(res, "Invalid lectureId")
      
      const lecture = await findLectureUnique("id", lectureId)
      if (!lecture) return notFound(res, "Lecture doesn't exist.")
      
      return send(res, `lectureId [${lectureId}] - Data`, 200, lecture)
    } catch (errorObject) {
      return res.status(500).json({
        errorObject,
        message: "Error - Something Went Wrong.",
        status: 500
      })
    }
    
  }
  
  async updateLecture(req: Request, res: Response) {
    try {
      const user = await AuthController.user(req, res)
      if (!user || user.role !== UserRole.Admin) return unauthorized(res, "Unauthorized cannot update a lecture.")

      const lectureId = parameterExists(req, res, "lectureId")
      if (!lectureId) return badRequest(res, "Invalid lectureId")
      
      const lecture = await findLectureUnique("id", lectureId)
      if (!lecture) return notFound(res, "Lecture doesn't exist.")
      
      const module = await db.module.findUnique({ where: { id: lecture.moduleId } })
    
      if (user?.yearId !== module?.yearId) return unauthorized(res, "Unauthorized")
    
      const body = subjectLecture.update.safeParse(req.body)
      if (!body.success) return validationErrors(res, extractErrors(body))
      
      const data = body.data
      if (body.data.subjectId) {
        const subject = findSubjectUnique("id", body.data.subjectId)
        if (!subject) return notFound(res, "Subject id doesn't exist.")
      }

      await db.lecture.update({
        where: { id: lectureId },
        data: {
          ...data,
          subjectId: data.subjectId ? data.subjectId : lecture.subjectId,
          subTitle: data.subTitle ?? '',
        }
      })
      const updatedLecture = findLectureUnique("id", lectureId) // :=(
      return send(res, "Lecture has been updated", 200, updatedLecture)
    } catch (errorObject) {
      console.log(errorObject)
      return res.status(500).json({
        errorObject,
        message: "Error - Something Went Wrong.",
        status: 500
      })
    }
    
  }

  async deleteLecture(req: Request, res: Response) {
    try {
      const user = await AuthController.user(req, res)
      if (!user || user.role !== UserRole.Admin) return unauthorized(res, "Unauthorized cannot delete a lecture.")

      const lectureId = parameterExists(req, res, "lectureId")
      if (!lectureId) return badRequest(res, "Invalid lectureId")
      
      const lecture = await findLectureUnique("id", lectureId)
      if (!lecture) return notFound(res, "Lecture doesn't exist.")
      
      const module = await db.module.findUnique({ where: { id: lecture.moduleId } })
     
      if (user?.yearId !== module?.yearId) return unauthorized(res, "Unauthorized")
  
      await db.lecture.delete({
        where: { id: lectureId }
      })
      return send(res, "Lecture has been deleted", 200, lecture)
    } catch (errorObject) {
      return res.status(500).json({
        errorObject,
        message: "Error - Something Went Wrong.",
        status: 500
      })
    }
  }

  async getLinks(req: Request, res: Response) {

    try {
      const lectureId = parameterExists(req, res, "lectureId")
      if (!lectureId) return badRequest(res, "Invalid lectureId")
      
      const lecture = await findLectureUnique("id", lectureId)
      if (!lecture) return notFound(res, "Lecture doesn't exist.")
      
      const links = await findLinkMany("lectureId", lectureId)
  
      return send(res, `lectureId [${lectureId}] - Links`, 200, links)
    } catch (errorObject) {
      return res.status(500).json({
        errorObject,
        message: "Error - Something Went Wrong.",
        status: 500
      })
    }
  }

  async getLink(req: Request, res: Response) {
    try {
      const linkId = parameterExists(req, res, "linkId")
      if (!linkId) return badRequest(res, "Invalid linkId")

      const link = await findLinkUnique("id", linkId)
      if (!link) return notFound(res, "Link not found.")

      return send(res, "Link Data", 200, link)
    } catch (errorObject) {
      return res.status(500).json({
        errorObject,
        message: "Error - Something Went Wrong.",
        status: 500
      })
    }

  }
    
  async createLink(req: Request, res: Response) {
    try {
      const user = await AuthController.user(req, res)
      if (!user || user.role !== UserRole.Admin) return unauthorized(res, "Unauthorized cannot create a link.")

      const lectureId = parameterExists(req, res, "lectureId")
      if (!lectureId) return badRequest(res, "Invalid lectureId")
      
      const lecture = await findLectureUnique("id", lectureId)
      if (!lecture) return notFound(res, "Lecture doesn't exist.")
      
      const module = await db.module.findUnique({ where: { id: lecture.moduleId } })
      if (user?.yearId !== module?.yearId) return unauthorized(res, "Unauthorized")
    
      const body = linkSchema.create.safeParse(req.body)
      if (!body.success) return validationErrors(res, extractErrors(body))

      const data = body.data
      const { id: linkId } = await db.lectureLink.create({
        data: {
          ...data,
          subTitle: data.subTitle ?? '',
          lectureId: lecture.id,
          createdAt: currentDate()
        }
      })
      const createdLink = await findLinkUnique("id", linkId)
      return send(res, "Lecture Link has been created", 201, createdLink)
    } catch (errorObject) {
      return res.status(500).json({
        errorObject,
        message: "Error - Something Went Wrong.",
        status: 500
      })
    }
  }
    
  async updateLink(req: Request, res: Response) {
    try {
      const user = await AuthController.user(req, res)
      if (!user || user.role !== UserRole.Admin) return unauthorized(res, "Unauthorized cannot update a link.")

      const linkId = parameterExists(req, res, "linkId")
      if (!linkId) return badRequest(res, "Invalid linkId")
      
      const link = await findLinkUnique("id", linkId)
      if (!link) return notFound(res, "Link doesn't exist.")
      
      const body = linkSchema.update.safeParse(req.body)
      if (!body.success) return validationErrors(res, extractErrors(body))
  
      const data = body.data
      await db.lectureLink.update({
        where: { id: link.id },
        data: {
          ...data,
          
        }
      })
      const updatedLink = await findLinkUnique("id", linkId)! // :=(
      return send(res, "Link has been updated", 200, updatedLink)
    } catch (errorObject) {
      return res.status(500).json({
        errorObject,
        message: "Error - Something Went Wrong.",
        status: 500
      })
    }
  
  }

  async deleteLink(req: Request, res: Response) {
    try {
      const user = await AuthController.user(req, res)
      if (!user || user.role !== UserRole.Admin) return unauthorized(res, "Unauthorized cannot delete a link.")

      const linkId = parameterExists(req, res, "linkId")
      if (!linkId) return badRequest(res, "Invalid linkId")
      
      const link = await findLinkUnique("id", linkId)
      if (!link) return notFound(res, "Link doesn't exist.")
     
      await db.lectureLink.delete({
        where: { id: link.id }
      })
      return send(res, "Link has been deleted", 200, link)
    } catch (errorObject) {
      return res.status(500).json({
        errorObject,
        message: "Error - Something Went Wrong.",
        status: 500
      })
    }
  }
  
}