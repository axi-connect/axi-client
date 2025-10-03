"use client"

import { FC } from "react"
import Lottie from "lottie-react"
import animationData from "../../../../public/animations/loader.json"

type Props = {
  loop?: boolean
  autoplay?: boolean
  className?: string
}

const Loader: FC<Props> = ({ loop = true, autoplay = true, className }) => {
  return (
    <div className={className}>
      <Lottie 
        animationData={animationData} 
        loop={loop} 
        autoplay={autoplay} 
      />
    </div>
  )
}

export default Loader