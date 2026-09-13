import { useEffect, useRef, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import { AnimatePresence, motion } from "motion/react";

import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

const ACCEPT = "image/jpeg,.jpg,.jpeg";

const MotionBox = motion(Box);
const MotionCard = motion(Card);
const MotionPaper = motion(Paper);

function formatBytes(bytes) {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];

  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / 1024 ** index).toFixed(
    index === 0 ? 0 : 2
  )} ${units[index]}`;
}

function getOutputName(name) {
  const base = name.replace(/\.(jpe?g)$/i, "");

  return `${base}.png`;
}

async function convertJpgToPng(file) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve(img);
      };

      img.onerror = () => {
        reject(
          new Error(
            "The selected image could not be decoded."
          )
        );
      };

      img.src = objectUrl;
    });

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("The image has invalid dimensions.");
    }

    const canvas = document.createElement("canvas");

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d", {
      alpha: true,
    });

    if (!context) {
      throw new Error(
        "Your browser does not support Canvas conversion."
      );
    }

    // Preserve the original image dimensions.
    context.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("PNG encoding failed."));
          }
        },
        "image/png"
      );
    });

    return {
      blob,
      width: canvas.width,
      height: canvas.height,
      outputName: getOutputName(file.name),
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function Main() {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /*
   * Cleanup the preview object URL whenever it changes or the
   * component unmounts. Kept in its own effect (separate from the
   * result URL) so that finishing a conversion doesn't revoke the
   * still-in-use preview URL.
   */
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /*
   * Cleanup the converted result's object URL whenever it changes or
   * the component unmounts.
   */
  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  /*
   * Reset everything.
   */
  const reset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (result?.url) {
      URL.revokeObjectURL(result.url);
    }

    setFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
    setBusy(false);
    setDragActive(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  /*
   * Select and convert JPG.
   */
  const selectFile = async (selectedFile) => {
    setError("");
    setResult(null);

    if (!selectedFile) {
      return;
    }

    const isJpg =
      selectedFile.type === "image/jpeg" ||
      /\.(jpe?g)$/i.test(selectedFile.name);

    if (!isJpg) {
      setError("Please select a JPG or JPEG image.");
      return;
    }

    /*
     * Maximum file size: 25 MB
     */
    if (selectedFile.size > 25 * 1024 * 1024) {
      setError(
        "Please choose an image smaller than 25 MB."
      );
      return;
    }

    /*
     * Remove previous preview URL.
     */
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const newPreviewUrl =
      URL.createObjectURL(selectedFile);

    setFile(selectedFile);
    setPreviewUrl(newPreviewUrl);
    setBusy(true);

    try {
      const converted =
        await convertJpgToPng(selectedFile);

      const url = URL.createObjectURL(converted.blob);

      setResult({
        ...converted,
        url,
      });
    } catch (err) {
      setError(
        err?.message ||
          "Conversion failed. Please try another image."
      );
    } finally {
      setBusy(false);
    }
  };

  /*
   * File input.
   */
  const handleInput = (event) => {
    const selectedFile = event.target.files?.[0];

    selectFile(selectedFile);
  };

  /*
   * Drag over.
   */
  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  /*
   * Drag leave.
   */
  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragActive(false);
  };

  /*
   * Drop file.
   */
  const handleDrop = (event) => {
    event.preventDefault();

    setDragActive(false);

    const selectedFile =
      event.dataTransfer.files?.[0];

    selectFile(selectedFile);
  };

  /*
   * Download converted PNG.
   */
  const downloadPng = () => {
    if (!result) {
      return;
    }

    const anchor = document.createElement("a");

    anchor.href = result.url;
    anchor.download = result.outputName;

    document.body.appendChild(anchor);

    anchor.click();

    anchor.remove();
  };

  return (
    <Box
      className="app-shell"
      sx={{
        minHeight: "100vh",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ================================
          FLOATING BACKGROUND SHAPE 1
      ================================= */}
      <MotionBox
        animate={{
          x: [0, 25, 0],
          y: [0, -25, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        sx={{
          position: "fixed",
          width: 240,
          height: 240,
          borderRadius: "50%",
          top: "5%",
          left: "-100px",
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(25,118,210,0.15), transparent 70%)",
          filter: "blur(5px)",
        }}
      />

      {/* ================================
          FLOATING BACKGROUND SHAPE 2
      ================================= */}
      <MotionBox
        animate={{
          x: [0, -20, 0],
          y: [0, 25, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        sx={{
          position: "fixed",
          width: 280,
          height: 280,
          borderRadius: "50%",
          bottom: "-100px",
          right: "-100px",
          pointerEvents: "none",
          background:
            "radial-gradient(circle, rgba(156,39,176,0.12), transparent 70%)",
          filter: "blur(5px)",
        }}
      />

      {/* ================================
          MAIN CONTAINER
      ================================= */}
      <Container
        maxWidth="md"
        sx={{
          position: "relative",
          zIndex: 1,
          py: {
            xs: 4,
            sm: 6,
            md: 8,
          },
        }}
      >
        <Stack spacing={3}>

          {/* ================================
              HEADER
          ================================= */}
          <MotionBox
            initial={{
              opacity: 0,
              y: -30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.7,
              ease: "easeOut",
            }}
          >
            <Stack
              alignItems="center"
              spacing={1.5}
              textAlign="center"
            >

              {/* Badge */}
              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.7,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                transition={{
                  delay: 0.15,
                  duration: 0.5,
                  type: "spring",
                  stiffness: 200,
                }}
              >
                <Chip
                  icon={<ImageRoundedIcon />}
                  label="Image utility"
                  color="primary"
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                    px: 0.5,
                  }}
                />
              </motion.div>

              {/* Heading */}
              <Typography
                component="h1"
                variant="h3"
                fontWeight={800}
                sx={{
                  fontSize: {
                    xs: "2rem",
                    sm: "2.6rem",
                    md: "3rem",
                  },
                }}
              >
                JPG to PNG Converter
              </Typography>

              {/* Description */}
              <Typography
                color="text.secondary"
                maxWidth={650}
                sx={{
                  lineHeight: 1.7,
                }}
              >
                Convert JPG and JPEG images to PNG
                instantly in your browser. Your image
                never leaves your device.
              </Typography>
            </Stack>
          </MotionBox>

          {/* ================================
              MAIN CARD
          ================================= */}
          <MotionCard
            elevation={0}
            className="main-card"
            initial={{
              opacity: 0,
              y: 40,
              scale: 0.97,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{
              delay: 0.2,
              duration: 0.7,
              ease: "easeOut",
            }}
            whileHover={{
              y: -3,
            }}
            sx={{
              transition:
                "box-shadow 0.3s ease",
            }}
          >
            <CardContent
              sx={{
                p: {
                  xs: 2,
                  sm: 4,
                },
              }}
            >

              {/* Hidden file input */}
              <input
                ref={inputRef}
                hidden
                type="file"
                accept={ACCEPT}
                onChange={handleInput}
              />

              <AnimatePresence mode="wait">

                {/* =====================================
                    UPLOAD AREA
                ====================================== */}
                {!file && (
                  <MotionPaper
                    key="upload-area"
                    component="button"
                    type="button"
                    variant="outlined"
                    className={
                      dragActive
                        ? "drop-zone drag-active"
                        : "drop-zone"
                    }
                    onClick={() =>
                      inputRef.current?.click()
                    }
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    initial={{
                      opacity: 0,
                      scale: 0.95,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.95,
                    }}
                    transition={{
                      duration: 0.35,
                    }}
                    whileHover={{
                      scale: 1.015,
                    }}
                    whileTap={{
                      scale: 0.985,
                    }}
                    sx={{
                      width: "100%",
                      minHeight: {
                        xs: 300,
                        sm: 340,
                      },
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      textAlign: "center",
                      p: 3,
                      borderRadius: 3,
                      borderStyle: "dashed",
                      transition:
                        "background-color 0.25s ease, border-color 0.25s ease",
                      backgroundColor: dragActive
                        ? "rgba(25,118,210,0.06)"
                        : "transparent",
                      borderColor: dragActive
                        ? "primary.main"
                        : "divider",
                    }}
                  >

                    {/* Animated upload icon */}
                    <motion.div
                      animate={{
                        y: dragActive
                          ? -12
                          : [0, -7, 0],
                        scale: dragActive
                          ? 1.1
                          : 1,
                      }}
                      transition={
                        dragActive
                          ? {
                              duration: 0.25,
                            }
                          : {
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }
                      }
                    >
                      <CloudUploadRoundedIcon
                        color="primary"
                        sx={{
                          fontSize: {
                            xs: 55,
                            sm: 65,
                          },
                        }}
                      />
                    </motion.div>

                    {/* Upload heading */}
                    <Typography
                      variant="h6"
                      fontWeight={800}
                      mt={1.5}
                    >
                      {dragActive
                        ? "Drop your image here"
                        : "Drop your JPG here"}
                    </Typography>

                    {/* Upload description */}
                    <Typography
                      color="text.secondary"
                      mt={0.5}
                    >
                      or click to browse from your
                      computer
                    </Typography>

                    {/* Upload button */}
                    <motion.div
                      whileHover={{
                        scale: 1.05,
                      }}
                      whileTap={{
                        scale: 0.95,
                      }}
                    >
                      <Button
                        variant="contained"
                        startIcon={
                          <CloudUploadRoundedIcon />
                        }
                        sx={{
                          mt: 2,
                          pointerEvents: "none",
                        }}
                      >
                        Choose JPG
                      </Button>
                    </motion.div>

                    {/* File restriction */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      mt={1.5}
                    >
                      JPG/JPEG • Maximum 25 MB
                    </Typography>
                  </MotionPaper>
                )}

                {/* =====================================
                    SELECTED FILE
                ====================================== */}
                {file && (
                  <MotionBox
                    key="selected-file"
                    initial={{
                      opacity: 0,
                      x: 30,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    exit={{
                      opacity: 0,
                      x: -30,
                    }}
                    transition={{
                      duration: 0.4,
                    }}
                  >
                    <Stack spacing={2.5}>

                      {/* FILE INFORMATION */}
                      <MotionBox
                        initial={{
                          opacity: 0,
                          y: 15,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay: 0.1,
                        }}
                      >
                        <Stack
                          direction={{
                            xs: "column",
                            sm: "row",
                          }}
                          spacing={2}
                          alignItems={{
                            sm: "center",
                          }}
                        >

                          {/* IMAGE PREVIEW */}
                          <motion.div
                            initial={{
                              opacity: 0,
                              scale: 0.8,
                              rotate: -5,
                            }}
                            animate={{
                              opacity: 1,
                              scale: 1,
                              rotate: 0,
                            }}
                            transition={{
                              duration: 0.5,
                              type: "spring",
                              stiffness: 180,
                            }}
                            whileHover={{
                              scale: 1.04,
                              rotate: 1,
                            }}
                            style={{
                              display: "inline-flex",
                              width: "fit-content",
                            }}
                          >
                            <Box
                              component="img"
                              src={previewUrl}
                              alt="Selected JPG preview"
                              className="preview"
                              sx={{
                                width: {
                                  xs: "100%",
                                  sm: 120,
                                },
                                maxWidth: 160,
                                height: 120,
                                objectFit: "cover",
                                borderRadius: 2,
                                display: "block",
                              }}
                            />
                          </motion.div>

                          {/* FILE DETAILS */}
                          <Box
                            flex={1}
                            minWidth={0}
                          >
                            <Typography
                              fontWeight={800}
                              noWrap
                              title={file.name}
                            >
                              {file.name}
                            </Typography>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              {formatBytes(file.size)}

                              {result &&
                                ` • ${result.width} × ${result.height}px`}
                            </Typography>

                            <Stack
                              direction="row"
                              spacing={1}
                              mt={1}
                              flexWrap="wrap"
                            >
                              {/* JPG CHIP */}
                              <motion.div
                                initial={{
                                  opacity: 0,
                                  scale: 0.7,
                                }}
                                animate={{
                                  opacity: 1,
                                  scale: 1,
                                }}
                              >
                                <Chip
                                  size="small"
                                  label="JPG"
                                />
                              </motion.div>

                              {/* PNG CHIP */}
                              <AnimatePresence>
                                {result && (
                                  <motion.div
                                    initial={{
                                      opacity: 0,
                                      scale: 0.7,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      scale: 1,
                                    }}
                                    transition={{
                                      type: "spring",
                                      stiffness: 300,
                                    }}
                                  >
                                    <Chip
                                      size="small"
                                      color="success"
                                      icon={
                                        <CheckCircleRoundedIcon />
                                      }
                                      label="PNG ready"
                                    />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </Stack>
                          </Box>

                          {/* DELETE */}
                          <motion.div
                            whileHover={{
                              scale: 1.12,
                              rotate: 8,
                            }}
                            whileTap={{
                              scale: 0.9,
                            }}
                          >
                            <IconButton
                              onClick={reset}
                              aria-label="Remove image"
                            >
                              <DeleteOutlineRoundedIcon />
                            </IconButton>
                          </motion.div>
                        </Stack>
                      </MotionBox>

                      {/* =================================
                          CONVERSION PROGRESS
                      ================================== */}
                      <AnimatePresence>
                        {busy && (
                          <MotionBox
                            initial={{
                              opacity: 0,
                              height: 0,
                            }}
                            animate={{
                              opacity: 1,
                              height: "auto",
                            }}
                            exit={{
                              opacity: 0,
                              height: 0,
                            }}
                          >
                            <Stack spacing={1}>

                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                >
                                  Converting image...
                                </Typography>

                                <motion.div
                                  animate={{
                                    opacity: [
                                      0.4,
                                      1,
                                      0.4,
                                    ],
                                  }}
                                  transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    color="primary"
                                    fontWeight={600}
                                  >
                                    Processing
                                  </Typography>
                                </motion.div>
                              </Stack>

                              <LinearProgress
                                sx={{
                                  height: 6,
                                  borderRadius: 10,
                                }}
                              />
                            </Stack>
                          </MotionBox>
                        )}
                      </AnimatePresence>

                      {/* =================================
                          RESULT
                      ================================== */}
                      <AnimatePresence>
                        {result && !busy && (
                          <MotionBox
                            initial={{
                              opacity: 0,
                              y: 20,
                              scale: 0.97,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              scale: 1,
                            }}
                            transition={{
                              duration: 0.45,
                              ease: "easeOut",
                            }}
                          >
                            <Divider />

                            <MotionBox
                              className="result-box"
                              sx={{
                                mt: 2,
                                p: {
                                  xs: 2,
                                  sm: 2.5,
                                },
                                borderRadius: 2,
                                backgroundColor:
                                  "rgba(46,125,50,0.06)",
                              }}
                              initial={{
                                boxShadow:
                                  "0 0 0 rgba(46,125,50,0)",
                              }}
                              animate={{
                                boxShadow: [
                                  "0 0 0 rgba(46,125,50,0)",
                                  "0 0 25px rgba(46,125,50,0.15)",
                                  "0 0 0 rgba(46,125,50,0)",
                                ],
                              }}
                              transition={{
                                duration: 1.5,
                              }}
                            >
                              <Stack
                                direction={{
                                  xs: "column",
                                  sm: "row",
                                }}
                                spacing={2}
                                alignItems={{
                                  sm: "center",
                                }}
                              >

                                {/* SUCCESS TEXT */}
                                <Box flex={1}>
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                  >
                                    <motion.div
                                      initial={{
                                        scale: 0,
                                      }}
                                      animate={{
                                        scale: 1,
                                      }}
                                      transition={{
                                        delay: 0.1,
                                        type: "spring",
                                        stiffness: 300,
                                      }}
                                    >
                                      <CheckCircleRoundedIcon
                                        color="success"
                                      />
                                    </motion.div>

                                    <Typography
                                      fontWeight={800}
                                    >
                                      Conversion complete
                                    </Typography>
                                  </Stack>

                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    mt={0.5}
                                  >
                                    Original dimensions
                                    preserved. PNG output
                                    is ready.
                                  </Typography>
                                </Box>

                                {/* DOWNLOAD */}
                                <motion.div
                                  whileHover={{
                                    scale: 1.04,
                                    y: -2,
                                  }}
                                  whileTap={{
                                    scale: 0.96,
                                  }}
                                >
                                  <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={
                                      <DownloadRoundedIcon />
                                    }
                                    onClick={downloadPng}
                                  >
                                    Download PNG
                                  </Button>
                                </motion.div>
                              </Stack>
                            </MotionBox>
                          </MotionBox>
                        )}
                      </AnimatePresence>

                      {/* =================================
                          CHOOSE ANOTHER FILE
                      ================================== */}
                      <motion.div
                        whileHover={{
                          scale: 1.01,
                        }}
                        whileTap={{
                          scale: 0.99,
                        }}
                      >
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={() =>
                            inputRef.current?.click()
                          }
                          disabled={busy}
                        >
                          Choose another JPG
                        </Button>
                      </motion.div>
                    </Stack>
                  </MotionBox>
                )}
              </AnimatePresence>

              {/* =====================================
                  ERROR
              ====================================== */}
              <AnimatePresence>
                {error && (
                  <MotionBox
                    initial={{
                      opacity: 0,
                      y: -10,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      height: "auto",
                    }}
                    exit={{
                      opacity: 0,
                      y: -10,
                      height: 0,
                    }}
                  >
                    <motion.div
                      animate={{
                        x: [
                          0,
                          -6,
                          6,
                          -4,
                          4,
                          0,
                        ],
                      }}
                      transition={{
                        duration: 0.4,
                      }}
                    >
                      <Alert
                        severity="error"
                        sx={{
                          mt: 2,
                        }}
                      >
                        {error}
                      </Alert>
                    </motion.div>
                  </MotionBox>
                )}
              </AnimatePresence>
            </CardContent>
          </MotionCard>

          {/* =====================================
              FEATURES FOOTER
          ====================================== */}
          <MotionBox
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.45,
              duration: 0.5,
            }}
          >
            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={2}
              justifyContent="center"
              alignItems="center"
            >
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <LockRoundedIcon fontSize="small" />

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  100% client-side
                </Typography>
              </Stack>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                •
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                No server upload
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                •
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Original pixel dimensions preserved
              </Typography>
            </Stack>
          </MotionBox>
        </Stack>
      </Container>
    </Box>
  );
}