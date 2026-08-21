import { useState } from "react";
import citifixLogo from "@/assets/citifix-logo.png";
import { Button } from "./ui/button";
import { Menu, User, UserCog,X } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
export default function Navbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const logoUrl = citifixLogo;

  return (
    <div>
      <div
        className="fixed top-10 left-1/2 -translate-x-1/2 
  w-[95%] sm:w-[90%] max-w-4xl 
  bg-black/20 backdrop-blur-2xl z-50 
  border border-white/10 rounded-3xl shadow-2xl"
      >
        <div className="px-4 sm:px-6 py-3 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          ><Link to={"/"} className="flex flex-row items-center gap-2">
            <img
              src={logoUrl}
              alt="CITIFIX Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-2xl"
            />
            <span className="text-base sm:text-lg font-bold font-figtree text-white">
              CITIFIX
            </span>
            </Link>
          </motion.div>


          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden sm:flex gap-2 items-center"
          >
            <Button
              variant="outline"
              className="bg-white/10 text-white text-sm border-white/20 hover:bg-white/20 inline-flex items-center gap-2"
              onClick={() => navigate("/map")}
            >
              🗺️ Live Map
            </Button>

            <Button
              variant="outline"
              className="bg-white/30 text-white text-sm border-white/20 hover:bg-white/15 inline-flex items-center gap-2"
              onClick={() => navigate("/login")}
            >
              <User className="h-5 w-5" /> Login
            </Button>

            <Button
              className="bg-white/90 hover:bg-white/20 border border-white hover:text-white text-black/90 rounded-3xl text-sm px-6"
              onClick={() => navigate("/login")}
            >
              Get Started
            </Button>
          </motion.div>


          <button
            onClick={() => setOpen(!open)}
            className="sm:hidden text-white"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>


        {open && (
          <div className="sm:hidden px-4 pb-4 pt-2 space-y-2">
            <Button
              variant="outline"
              className="w-full bg-white/10 text-white border-white/20 inline-flex items-center gap-2 hover:bg-white/20"
              onClick={() => { navigate("/map"); setOpen(false); }}
            >
              🗺️ Live City Map
            </Button>
            <Button
              variant="outline"
              className="w-full bg-white/30 text-white border-white/20  inline-flex items-center gap-2 hover:bg-white/15"
              onClick={() => navigate("/login")}
            >
              <User className="h-6 w-6" /> Login
            </Button>


            <Button
              className="w-full bg-white/90 hover:bg-white/20 border border-white hover:text-white text-black/90 rounded-3xl"
              onClick={() => navigate("/login")}
            >
              Get Started
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
