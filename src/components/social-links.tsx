"use client";

import { motion } from "framer-motion";
import { Linkedin } from "lucide-react";

const SocialLinks = () => {
  const socialLinks = [
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/in/ahmedkhan25/",
      icon: <Linkedin className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex items-center space-x-3">
      {socialLinks.map((link, index) => (
        <motion.a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 + index * 0.1, duration: 0.5, ease: "easeOut" }}
          aria-label={`Follow us on ${link.name}`}
        >
          {link.icon}
        </motion.a>
      ))}
    </div>
  );
};

export default SocialLinks;
