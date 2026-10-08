import os, base64, io
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import cv2
import numpy as np

app=FastAPI(title="AI Math Wrong Answer API")
app.add_middleware(CORSMiddleware,allow_origins=["*"],allow_credentials=False,allow_methods=["*"],allow_headers=["*"])

API_KEY=os.getenv("OPENAI_API_KEY")
MODEL=os.getenv("OPENAI_VISION_MODEL","gpt-6-luna")
client=OpenAI(api_key=API_KEY) if API_KEY else None

class AnalyzeRequest(BaseModel):
    image:str

SCHEMA={
"type":"object","properties":{"wrongProblems":{"type":"array","items":{"type":"object","properties":{
"question":{"type":"string"},"correctAnswer":{"type":"string"},"explanation":{"type":"string"},
"confidence":{"type":"number","minimum":0,"maximum":1},
"problemBox":{"type":"array","items":{"type":"number"},"minItems":4,"maxItems":4},
"eraseBoxes":{"type":"array","items":{"type":"array","items":{"type":"number"},"minItems":4,"maxItems":4}}
,"isWrong":{"type":"boolean"}},"required":["question","correctAnswer","explanation","confidence","problemBox","eraseBoxes","isWrong"],"additionalProperties":False}}},"required":["wrongProblems"],"additionalProperties":False}

INSTRUCTIONS="""Analyze this photographed math worksheet.
Find each individual printed math problem. Identify the student's handwritten answer and grading marks such as X, O, check marks, circles, red pen marks, corrections, or teacher annotations.
Determine which problems are wrong. Solve the math when necessary.
For every wrong problem, return a normalized problemBox [x1,y1,x2,y2] from 0 to 1 containing the printed problem, choices and necessary diagram, excluding neighboring problems.
Return eraseBoxes as normalized boxes containing ONLY student handwriting and grading marks that should be removed. Never include printed problem text in eraseBoxes.
If uncertain, lower confidence below 0.70.
Do not return correct problems."""
def decode_data_url(s):
    if "," in s:s=s.split(",",1)[1]
    return base64.b64decode(s)

def clamp(v): return max(0.0,min(1.0,float(v)))

@app.get("/health")
def health(): return {"ok":bool(client),"model":MODEL}

@app.post("/analyze")
def analyze(req:AnalyzeRequest):
    if not client: raise HTTPException(500,"OPENAI_API_KEY is not configured on the server.")
    try:
        response=client.responses.create(
            model=MODEL,
            input=[{"role":"user","content":[
                {"type":"input_text","text":INSTRUCTIONS},
                {"type":"input_image","image_url":req.image}
            ]}],
            text={"format":{"type":"json_schema","name":"math_wrong_analysis","strict":True,"schema":SCHEMA}}
        )
        data=response.output_text
        import json
        result=json.loads(data)
        raw=decode_data_url(req.image)
        arr=np.frombuffer(raw,np.uint8); img=cv2.imdecode(arr,cv2.IMREAD_COLOR)
        if img is None: raise ValueError("Invalid image")
        h,w=img.shape[:2]
        out=[]
        for p in result.get("wrongProblems",[]):
            if not p.get("isWrong"): continue
            b=p["problemBox"]
            x1,x2=sorted([int(clamp(b[0])*w),int(clamp(b[2])*w)])
            y1,y2=sorted([int(clamp(b[1])*h),int(clamp(b[3])*h)])
            if x2-x1<20 or y2-y1<20: continue
            crop=img[y1:y2,x1:x2].copy()
            mask=np.zeros(crop.shape[:2],np.uint8)
            for eb in p.get("eraseBoxes",[]):
                ex1,ex2=sorted([int(clamp(eb[0])*w),int(clamp(eb[2])*w)])
                ey1,ey2=sorted([int(clamp(eb[1])*h),int(clamp(eb[3])*h)])
                ex1=max(x1,ex1)-x1; ex2=min(x2,ex2)-x1
                ey1=max(y1,ey1)-y1; ey2=min(y2,ey2)-y1
                if ex2>ex1 and ey2>ey1: mask[ey1:ey2,ex1:ex2]=255
            if mask.any():
                kernel=np.ones((5,5),np.uint8); mask=cv2.dilate(mask,kernel,iterations=1)
                crop=cv2.inpaint(crop,mask,3,cv2.INPAINT_TELEA)
            ok,jpg=cv2.imencode(".jpg",crop,[int(cv2.IMWRITE_JPEG_QUALITY),92])
            if not ok: continue
            cleaned="data:image/jpeg;base64,"+base64.b64encode(jpg.tobytes()).decode()
            out.append({"cleanedImage":cleaned,"question":p["question"],"correctAnswer":p["correctAnswer"],
                        "explanation":p["explanation"],"confidence":p["confidence"]})
        return {"wrongProblems":out,"model":MODEL}
    except Exception as e:
        raise HTTPException(500,str(e))
