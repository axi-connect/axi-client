"use client"

import Lottie from "lottie-react";
import animationData from "../../../../public/animations/loader.funny.json"

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Lottie 
            loop={true} 
            autoplay={true} 
            className="w-full h-full"
            animationData={animationData} 
        />
    </div>
  )
}