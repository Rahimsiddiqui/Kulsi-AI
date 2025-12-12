import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Untitled Note",
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    links: [
      {
        targetNoteId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Note",
          required: true,
        },
        targetNoteTitle: {
          type: String,
          required: true,
        },
      },
    ],
    isPinned: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isTrashed: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    color: {
      type: String,
      enum: ["default", "red", "orange", "yellow", "green", "blue", "purple"],
      default: "default",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Note", noteSchema);
