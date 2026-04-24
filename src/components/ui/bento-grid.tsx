import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[20rem] grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-4 max-w-[100vw] md:max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
  onClick,
  isFavorite,
  onToggleFavorite,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) => {
  return (
    <div
      className={cn(
        "row-span-1 aspect-[4/5] md:aspect-auto border border-zinc-900 group/bento transition-all duration-500 p-0 relative flex flex-col justify-between overflow-hidden cursor-pointer",
        className
      )}
      onClick={onClick}
    >
       <div className="w-full h-full">
         {header}
       </div>

       {/* Favorite Toggle Overlay */}
       <div className="absolute top-3 right-3 z-20">
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(e);
            }}
            className="p-2 bg-black/40 backdrop-blur-md rounded-full border border-white/5 hover:bg-black/60 transition-colors"
          >
            <motion.div
              animate={{ scale: isFavorite ? [1, 1.2, 1] : 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Heart 
                size={18} 
                className={cn(
                  "transition-colors duration-300",
                  isFavorite ? "fill-yellow-500 text-yellow-500" : "text-zinc-300"
                )} 
              />
            </motion.div>
          </motion.button>
       </div>
      
      {/* Immersive Overlay for Typography */}
      <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end translate-y-1 group-hover/bento:translate-y-0 opacity-100 md:opacity-0 group-hover/bento:opacity-100 transition-all duration-500">
        <div className="flex items-center gap-1.5 mb-0.5">
          {icon}
          <div className="font-serif font-bold text-white uppercase tracking-[0.15em] text-[9px] md:text-xs">
            {title}
          </div>
        </div>
        <div className="font-sans font-normal text-zinc-400 text-[8px] md:text-[10px] line-clamp-1">
          {description}
        </div>
      </div>
    </div>
  );
};
