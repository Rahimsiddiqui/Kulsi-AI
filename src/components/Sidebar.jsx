import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { FolderType } from "../../server/config/types.js";
import { INITIAL_FOLDERS } from "../../server/config/constants.js";
import {
  Layout,
  Star,
  Trash2,
  User,
  Briefcase,
  Lightbulb,
  Plus,
  Settings,
  Network,
  CreditCard,
  Notebook,
  Crown,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { motion } from "framer-motion";

const IconMap = {
  Layout,
  Star,
  Trash2,
  User,
  Briefcase,
  Lightbulb,
  Network,
  CreditCard,
};

const NavItem = ({
  icon: Icon,
  label,
  isActive,
  onClick,
  highlight = false,
  isCollapsed,
}) => (
  <SidebarTooltip text={label} isCollapsed={isCollapsed} alwaysShow={true}>
    <button
      onClick={onClick}
      className={`point w-full flex items-center ${
        isCollapsed ? "justify-center px-0" : "justify-between px-3"
      } py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
        isActive
          ? "bg-white text-indigo-600 shadow-sm ring-1 ring-gray-100"
          : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
      }`}
      aria-label={label}
    >
      <div
        className={`flex items-center ${
          isCollapsed ? "justify-center" : "space-x-3"
        }`}
      >
        <Icon
          className={`w-4 h-4 transition-colors ${
            isActive
              ? highlight
                ? "text-amber-500"
                : "text-indigo-600"
              : "text-gray-400 group-hover:text-gray-500"
          }`}
        />
        {!isCollapsed && <span>{label}</span>}
      </div>
      {isActive && !isCollapsed && (
        <motion.div
          layoutId="activeDot"
          className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
        />
      )}
    </button>
  </SidebarTooltip>
);

// Sidebar Tooltip Helper Component
const SidebarTooltip = ({
  text,
  children,
  isCollapsed,
  alwaysShow = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [buttonRect, setButtonRect] = useState(null);
  const buttonRef = useRef(null);
  const tooltipTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    // Show if alwaysShow is true, or if sidebar is collapsed
    if (!alwaysShow && !isCollapsed) return;
    if (buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
  };

  return (
    <>
      <div
        ref={buttonRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>

      {showTooltip &&
        buttonRect &&
        text &&
        createPortal(
          <div
            className="fixed bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded shadow-lg pointer-events-none"
            style={{
              top: `${buttonRect.top + buttonRect.height / 2}px`,
              left: `${buttonRect.right + 12}px`,
              transform: "translateY(-50%)",
              animation: "fadeIn 0.3s ease-out forwards",
              whiteSpace: "nowrap",
              zIndex: 9999,
            }}
          >
            {text}
          </div>,
          document.body
        )}
    </>
  );
};

const Sidebar = ({
  activeFolder,
  currentView,
  onSelectFolder,
  onSelectView,
  onCreateNote,
  isOpen,
  onOpenSettings,
  onOpenSubscription,
  userPlan,
  onToggle,
  isMobile,
}) => {
  const isCollapsed = !isOpen && !isMobile;

  return (
    <div
      className={`h-full flex flex-col bg-gray-50/90 backdrop-blur-xl supports-backdrop-filter:bg-gray-50/60 w-full transition-all duration-300`}
    >
      <div
        className={`flex items-center ${
          isCollapsed
            ? "justify-center flex-col py-4 gap-4"
            : "justify-between p-5"
        }`}
      >
        {/* Toggle Button for Desktop Mini Mode */}
        {!isMobile && isCollapsed && (
          <SidebarTooltip
            text="Expand sidebar"
            isCollapsed={isCollapsed}
            alwaysShow={true}
          >
            <button
              onClick={onToggle}
              className="point p-1.5 hover:bg-gray-200/50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors mb-2"
              aria-label="Expand sidebar"
            >
              <ChevronsRight className="w-h" />
            </button>
          </SidebarTooltip>
        )}

        {/* Logo Area - Hidden when collapsed */}
        {!isCollapsed && (
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <Notebook className="w-6 h-6 text-primary" />
            </div>
            <span className="text-gray-900">Kulsi AI</span>
          </div>
        )}

        {/* Desktop Collapse Button (Expanded State) */}
        {!isMobile && !isCollapsed && (
          <SidebarTooltip
            text="Collapse sidebar"
            isCollapsed={isCollapsed}
            alwaysShow={true}
          >
            <button
              onClick={onToggle}
              className="point p-1.5 hover:bg-gray-200/50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="w-h" />
            </button>
          </SidebarTooltip>
        )}
      </div>

      <div className={`px-4 pb-6 ${isCollapsed ? "px-2" : ""}`}>
        <SidebarTooltip
          text="New Note"
          isCollapsed={isCollapsed}
          alwaysShow={true}
        >
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onCreateNote}
            className={`point w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 ${
              isCollapsed ? "px-0" : "px-4"
            } rounded-xl flex items-center justify-center space-x-1 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300`}
            aria-label="Create new note"
          >
            <Plus className="w-h" />
            {!isCollapsed && <span>New Note</span>}
          </motion.button>
        </SidebarTooltip>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar">
        {!isCollapsed && (
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mt-2 mb-2">
            Views
          </div>
        )}
        <NavItem
          icon={Network}
          label="Graph View"
          isActive={currentView === "graph"}
          onClick={() => onSelectView("graph")}
          isCollapsed={isCollapsed}
        />
        <NavItem
          icon={CreditCard}
          label="Flashcards"
          isActive={currentView === "flashcards"}
          onClick={() => onSelectView("flashcards")}
          isCollapsed={isCollapsed}
        />

        {!isCollapsed && (
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mt-6 mb-2">
            Library
          </div>
        )}
        {isCollapsed && <div className="my-4 h-px bg-gray-200 mx-2" />}

        {INITIAL_FOLDERS.filter(
          (f) => f.type === "system" && f.id !== FolderType.TRASH
        ).map((folder) => (
          <NavItem
            key={folder.id}
            icon={IconMap[folder.icon]}
            label={folder.name}
            isActive={currentView === "notes" && activeFolder === folder.id}
            onClick={() => {
              onSelectFolder(folder.id);
              onSelectView("notes");
            }}
            isCollapsed={isCollapsed}
          />
        ))}

        {!isCollapsed && (
          <div className="flex items-center justify-between px-3 mt-6 mb-2 group point">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Folders
            </div>
            <Plus className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 transition-opacity" />
          </div>
        )}
        {isCollapsed && <div className="my-4 h-px bg-gray-200 mx-2" />}

        {INITIAL_FOLDERS.filter((f) => f.type === "user").map((folder) => (
          <NavItem
            key={folder.id}
            icon={IconMap[folder.icon]}
            label={folder.name}
            isActive={currentView === "notes" && activeFolder === folder.id}
            onClick={() => {
              onSelectFolder(folder.id);
              onSelectView("notes");
            }}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      <div
        className={`p-4 border-t border-gray-200/60 space-y-2 ${
          isCollapsed ? "flex flex-col items-center" : ""
        }`}
      >
        {userPlan === "free" && (
          <SidebarTooltip
            text="Go Pro"
            isCollapsed={isCollapsed}
            alwaysShow={true}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={onOpenSubscription}
              className={`bg-linear-to-r from-indigo-500 to-purple-600 rounded-xl ${
                isCollapsed ? "p-2" : "p-3"
              } text-white point shadow-md mb-3`}
              role="button"
              tabIndex={0}
              aria-label="Go Pro"
            >
              {isCollapsed ? (
                <Crown className="w-4 h-4 mx-auto" />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Go Pro
                    </span>
                  </div>
                  <p className="text-xs text-indigo-100 leading-tight">
                    Unlock AI, Sync & more.
                  </p>
                </>
              )}
            </motion.div>
          </SidebarTooltip>
        )}

        <SidebarTooltip
          text="Settings"
          isCollapsed={isCollapsed}
          alwaysShow={true}
        >
          <button
            onClick={onOpenSettings}
            className={`point flex items-center ${
              isCollapsed ? "justify-center" : "space-x-3"
            } text-gray-600 hover:text-gray-900 text-sm font-medium w-full px-3 py-2 rounded-xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100`}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
            {!isCollapsed && <span>Settings</span>}
          </button>
        </SidebarTooltip>
      </div>
    </div>
  );
};

export default Sidebar;
