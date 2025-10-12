// "use client";

// import {useState, useEffect} from "react";
// import { motion } from "framer-motion";
import { HomeIcon } from "@heroicons/react/24/outline";

export default async function DashboardPage() {
  // const [open, setOpen] = useState(false);

  // useEffect(() => {
    await new Promise(resolve => setTimeout(resolve, 20000));
  // }, []);

  return (
    <div className="p-6">
      <div className="flex items-center gap-2">
        <HomeIcon className="size-6 text-gray-900" />
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>
      <p className="mt-2 text-sm text-gray-500">Ruta privada de ejemplo.</p>

      {/* <motion.div
        className="mt-6 h-24 rounded-lg bg-gray-100 flex items-center justify-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <span className="text-gray-700">Animación con framer-motion</span>
      </motion.div> */}

      <div className="mx-auto max-w-4xl px-4 py-16">
        <button
          className="rounded-md bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
          // onClick={() => setOpen(true)}
        >
          Ver overlay de ejemplo
        </button>
      </div>
    </div>
  );
}