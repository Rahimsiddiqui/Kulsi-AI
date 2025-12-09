import React from "react";
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
  <button
    onClick={onClick}
    title={isCollapsed ? label : undefined}
    className={`w-full flex items-center ${
      isCollapsed ? "justify-center px-0" : "justify-between px-3"
    } py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group ${
      isActive
        ? "bg-white text-indigo-600 shadow-sm ring-1 ring-gray-100"
        : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
    }`}
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
);

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
      className={`h-full flex flex-col bg-gray-50/90 backdrop-blur-xl supports-[backdrop-filter]:bg-gray-50/60 w-full transition-all duration-300`}
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
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-gray-200/50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            <ChevronsRight className="w-5 h-5" />
          </button>
        )}

        {/* Logo Area - Hidden when collapsed */}
        {!isCollapsed && (
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-lg tracking-tight">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-200">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <span className="text-gray-900">Kulsi AI</span>
          </div>
        )}

        {/* Desktop Collapse Button (Expanded State) */}
        {!isMobile && !isCollapsed && (
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-gray-200/50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className={`px-4 pb-6 ${isCollapsed ? "px-2" : ""}`}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onCreateNote}
          title={isCollapsed ? "New Note" : undefined}
          className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 ${
            isCollapsed ? "px-0" : "px-4"
          } rounded-xl flex items-center justify-center space-x-1 transition-all shadow-lg shadow-indigo-200 hover:shadow-indigo-300`}
        >
          <Plus className="w-5 h-5" />
          {!isCollapsed && <span>New Note</span>}
        </motion.button>
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
          <div className="flex items-center justify-between px-3 mt-6 mb-2 group cursor-pointer">
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

        <div
          className={`mt-8 pt-4 ${
            isCollapsed ? "" : "border-t border-gray-200/50"
          }`}
        >
          <button
            onClick={() => {
              onSelectFolder(FolderType.TRASH);
              onSelectView("notes");
            }}
            title={isCollapsed ? "Trash" : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? "justify-center" : "space-x-3"
            } px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
              currentView === "notes" && activeFolder === FolderType.TRASH
                ? "bg-red-50 text-red-600"
                : "text-gray-600 hover:bg-red-50 hover:text-red-600"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {!isCollapsed && <span>Trash</span>}
          </button>
        </div>
      </nav>

      <div
        className={`p-4 border-t border-gray-200/60 space-y-2 ${
          isCollapsed ? "flex flex-col items-center" : ""
        }`}
      >
        {userPlan === "free" && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            onClick={onOpenSubscription}
            className={`bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl ${
              isCollapsed ? "p-2" : "p-3"
            } text-white cursor-pointer shadow-md mb-3`}
            title={isCollapsed ? "Go Pro" : undefined}
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
        )}

        <button
          onClick={onOpenSettings}
          title={isCollapsed ? "Settings" : undefined}
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "space-x-3"
          } text-gray-600 hover:text-gray-900 text-sm font-medium w-full px-3 py-2 rounded-xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100`}
        >
          <Settings className="w-4 h-4" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
