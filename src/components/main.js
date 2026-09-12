import { useRef, useState } from "react";
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
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

const ACCEPT = "image/jpeg,.jpg,.jpeg";

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
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
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("The selected image could not be decoded."));
      img.src = objectUrl;
    });

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("The image has invalid dimensions.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("Your browser does not support Canvas conversion.");

    // Draw at the original pixel dimensions. This avoids resizing or quality loss
    // caused by scaling during conversion.
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("PNG encoding failed."))),
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

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (result?.url) URL.revokeObjectURL(result.url);
    setFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFile = async (selectedFile) => {
    setError("");
    setResult(null);

    if (!selectedFile) return;

    const isJpg =
      selectedFile.type === "image/jpeg" ||
      /\.(jpe?g)$/i.test(selectedFile.name);

    if (!isJpg) {
      setError("Please select a JPG or JPEG image.");
      return;
    }

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError("Please choose an image smaller than 25 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));

    setBusy(true);
    try {
      const converted = await convertJpgToPng(selectedFile);
      const url = URL.createObjectURL(converted.blob);
      setResult({ ...converted, url });
    } catch (err) {
      setError(err.message || "Conversion failed. Please try another image.");
    } finally {
      setBusy(false);
    }
  };

  const handleInput = (event) => selectFile(event.target.files?.[0]);

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const downloadPng = () => {
    if (!result) return;
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = result.outputName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <Box className="app-shell">
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 7 } }}>
        <Stack spacing={3}>
          <Stack alignItems="center" spacing={1.2} textAlign="center">
            <Chip
              icon={<ImageRoundedIcon />}
              label="Image utility"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
            <Typography component="h1" variant="h3" fontWeight={800}>
              JPG to PNG Converter
            </Typography>
            <Typography color="text.secondary" maxWidth={650}>
              Convert JPG and JPEG images to PNG instantly in your browser.
              Your image never leaves your device.
            </Typography>
          </Stack>

          <Card elevation={0} className="main-card">
            <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
              <input
                ref={inputRef}
                hidden
                type="file"
                accept={ACCEPT}
                onChange={handleInput}
              />

              {!file ? (
                <Paper
                  component="button"
                  type="button"
                  variant="outlined"
                  className={`drop-zone ${dragActive ? "drag-active" : ""}`}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                >
                  <CloudUploadRoundedIcon sx={{ fontSize: 58 }} color="primary" />
                  <Typography variant="h6" fontWeight={800} mt={1}>
                    Drop your JPG here
                  </Typography>
                  <Typography color="text.secondary" mt={0.5}>
                    or click to browse from your computer
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadRoundedIcon />}
                    sx={{ mt: 2, pointerEvents: "none" }}
                  >
                    Choose JPG
                  </Button>
                  <Typography variant="caption" color="text.secondary" mt={1.5}>
                    JPG/JPEG • Maximum 25 MB
                  </Typography>
                </Paper>
              ) : (
                <Stack spacing={2.5}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                    <Box
                      component="img"
                      src={previewUrl}
                      alt="Selected JPG preview"
                      className="preview"
                    />
                    <Box flex={1} minWidth={0}>
                      <Typography fontWeight={800} noWrap title={file.name}>
                        {file.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatBytes(file.size)}
                        {result && ` • ${result.width} × ${result.height}px`}
                      </Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <Chip size="small" label="JPG" />
                        {result && (
                          <Chip
                            size="small"
                            color="success"
                            icon={<CheckCircleRoundedIcon />}
                            label="PNG ready"
                          />
                        )}
                      </Stack>
                    </Box>
                    <IconButton onClick={reset} aria-label="Remove image">
                      <DeleteOutlineRoundedIcon />
                    </IconButton>
                  </Stack>

                  {busy && <LinearProgress />}

                  {result && (
                    <>
                      <Divider />
                      <Box className="result-box">
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                          <Box flex={1}>
                            <Typography fontWeight={800}>Conversion complete</Typography>
                            <Typography variant="body2" color="text.secondary">
                              Original dimensions preserved. PNG output is ready.
                            </Typography>
                          </Box>
                          <Button
                            variant="contained"
                            size="large"
                            startIcon={<DownloadRoundedIcon />}
                            onClick={downloadPng}
                          >
                            Download PNG
                          </Button>
                        </Stack>
                      </Box>
                    </>
                  )}

                  <Button
                    variant="outlined"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                  >
                    Choose another JPG
                  </Button>
                </Stack>
              )}

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            </CardContent>
          </Card>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <LockRoundedIcon fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                100% client-side
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              •
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No server upload
            </Typography>
            <Typography variant="body2" color="text.secondary">
              •
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Original pixel dimensions preserved
            </Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}