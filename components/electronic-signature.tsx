"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  PenTool,
  Save,
  RotateCcw,
  Download,
  Upload,
  CheckCircle,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  Shield,
  Clock,
  User,
  FileText,
  Fingerprint,
  Lock,
  Zap,
} from "lucide-react"

// 签名类型枚举
const SignatureTypes = {
  HANDWRITTEN: "handwritten",
  TYPED: "typed",
  UPLOADED: "uploaded",
  BIOMETRIC: "biometric",
} as const

// 签名验证状态
const VerificationStatus = {
  PENDING: "pending",
  VERIFIED: "verified",
  FAILED: "failed",
  EXPIRED: "expired",
} as const

type SignatureType = (typeof SignatureTypes)[keyof typeof SignatureTypes]
type VerificationStatusType = (typeof VerificationStatus)[keyof typeof VerificationStatus]

interface SignatureInfo {
  hash: string
  timestamp: string
  userId: string
  data: string
}

interface SignatureRecord {
  id: string
  documentId: string
  userId: string
  type: string
  data: string
  hash: string
  timestamp: string
  deviceInfo: ReturnType<typeof ElectronicSignatureService.getDeviceInfo>
  ipAddress: string
  status: string
  metadata: {
    signatureBox: ReturnType<typeof ElectronicSignatureService.getSignatureBox>
    quality: string
  }
}

// 电子签名服务类
class ElectronicSignatureService {
  // 生成签名哈希
  static generateSignatureHash(signatureData: string, timestamp: string, userId: string): string {
    const data = `${signatureData}-${timestamp}-${userId}`
    return btoa(data)
      .replace(/[^a-zA-Z0-9]/g, "")
      .substring(0, 32)
  }

  // 验证签名完整性
  static verifySignature(signature: SignatureInfo): boolean {
    const { hash, timestamp, userId, data } = signature
    const expectedHash = this.generateSignatureHash(data, timestamp, userId)
    return hash === expectedHash
  }

  // 获取设备信息
  static getDeviceInfo() {
    const userAgent = navigator.userAgent
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(userAgent)

    return {
      type: isMobile ? (isTablet ? "tablet" : "mobile") : "desktop",
      userAgent: userAgent,
      timestamp: new Date().toISOString(),
      screen: {
        width: window.screen.width,
        height: window.screen.height,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    }
  }

  // 创建签名记录
  static createSignatureRecord(
    signatureData: string,
    type: string,
    userId: string,
    documentId: string,
  ): SignatureRecord {
    const timestamp = new Date().toISOString()
    const deviceInfo = this.getDeviceInfo()
    const hash = this.generateSignatureHash(signatureData, timestamp, userId)

    return {
      id: `sig_${Date.now()}`,
      documentId,
      userId,
      type,
      data: signatureData,
      hash,
      timestamp,
      deviceInfo,
      ipAddress: "192.168.1.100",
      status: VerificationStatus.VERIFIED,
      metadata: {
        signatureBox: this.getSignatureBox(),
        quality: this.assessSignatureQuality(signatureData, type),
      },
    }
  }

  // 获取签名区域信息
  static getSignatureBox() {
    return {
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    }
  }

  // 评估签名质量
  static assessSignatureQuality(data: string, type: string): string {
    switch (type) {
      case SignatureTypes.HANDWRITTEN:
        return data.length > 100 ? "high" : data.length > 50 ? "medium" : "low"
      case SignatureTypes.TYPED:
        return data.length > 2 ? "high" : "low"
      case SignatureTypes.UPLOADED:
        return "medium"
      default:
        return "unknown"
    }
  }
}

// 手写签名画板组件
function SignaturePad({
  onSignatureChange,
  disabled = false,
}: {
  onSignatureChange: (data: string) => void
  disabled?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  }, [])

  const [isDrawing, setIsDrawing] = useState(false)

  const getCanvasCoordinates = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
      return {
        x: (clientX ?? 0) - rect.left,
        y: (clientY ?? 0) - rect.top,
      }
    },
    [],
  )

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (disabled) return
      e.preventDefault()
      setIsDrawing(true)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const { x, y } = getCanvasCoordinates(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    },
    [disabled, getCanvasCoordinates],
  )

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || disabled) return
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const { x, y } = getCanvasCoordinates(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    },
    [isDrawing, disabled, getCanvasCoordinates],
  )

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    const dataURL = canvas.toDataURL()
    onSignatureChange(dataURL)
  }, [isDrawing, onSignatureChange])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onSignatureChange("")
  }, [onSignatureChange])

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
        <canvas
          ref={canvasRef}
          className="w-full h-48 bg-white rounded border cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ touchAction: "none" }}
        />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">请在上方区域签名</p>
        <Button variant="outline" size="sm" onClick={clearSignature} disabled={disabled}>
          <RotateCcw className="w-4 h-4 mr-2" />
          清除
        </Button>
      </div>
    </div>
  )
}

// 移动端优化的签名组件
function MobileSignaturePad({
  onSignatureChange,
  disabled = false,
}: {
  onSignatureChange: (data: string) => void
  disabled?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)

    const preventDefault = (e: Event) => e.preventDefault()
    canvas.addEventListener("touchstart", preventDefault)
    canvas.addEventListener("touchmove", preventDefault)
    canvas.addEventListener("touchend", preventDefault)

    return () => {
      canvas.removeEventListener("touchstart", preventDefault)
      canvas.removeEventListener("touchmove", preventDefault)
      canvas.removeEventListener("touchend", preventDefault)
    }
  }, [])

  const getEventPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    return {
      x: (((clientX ?? 0) - rect.left) * (canvas.width / rect.width)) / 2,
      y: (((clientY ?? 0) - rect.top) * (canvas.height / rect.height)) / 2,
    }
  }, [])

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (disabled) return
      e.preventDefault()
      setIsDrawing(true)
      const pos = getEventPos(e)
      setLastPoint(pos)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    },
    [disabled, getEventPos],
  )

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing || disabled) return
      e.preventDefault()
      const pos = getEventPos(e)
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      if (lastPoint) {
        ctx.beginPath()
        ctx.moveTo(lastPoint.x, lastPoint.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      }
      setLastPoint(pos)
    },
    [isDrawing, disabled, getEventPos, lastPoint],
  )

  const stopDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return
      e.preventDefault()
      setIsDrawing(false)
      setLastPoint(null)
      const canvas = canvasRef.current
      if (!canvas) return
      const dataURL = canvas.toDataURL()
      onSignatureChange(dataURL)
    },
    [isDrawing, onSignatureChange],
  )

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onSignatureChange("")
  }, [onSignatureChange])

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 bg-gray-50">
        <canvas
          ref={canvasRef}
          className="w-full h-64 bg-white rounded border touch-none"
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          style={{ touchAction: "none" }}
        />
      </div>
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">请用手指在上方区域签名</p>
        <Button variant="outline" size="sm" onClick={clearSignature} disabled={disabled}>
          <RotateCcw className="w-4 h-4 mr-2" />
          清除
        </Button>
      </div>
    </div>
  )
}

// 主要的电子签名组件
export function ElectronicSignature({
  documentId,
  onSignatureComplete,
  onClose,
  isMobile = false,
}: {
  documentId: string
  onSignatureComplete?: (record: SignatureRecord) => void
  onClose?: () => void
  isMobile?: boolean
}) {
  const [activeTab, setActiveTab] = useState("handwritten")
  const [signatureData, setSignatureData] = useState("")
  const [typedSignature, setTypedSignature] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [signatureRecords, setSignatureRecords] = useState<SignatureRecord[]>([])
  const [selectedFont, setSelectedFont] = useState("cursive")

  // 处理手写签名
  const handleHandwrittenSignature = (data: string) => {
    setSignatureData(data)
  }

  // 处理文字签名
  const handleTypedSignature = (text: string) => {
    setTypedSignature(text)
    const canvas = document.createElement("canvas")
    canvas.width = 400
    canvas.height = 100
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#000000"
    ctx.font = `40px ${selectedFont}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
    setSignatureData(canvas.toDataURL())
  }

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result
        if (typeof result === "string") {
          setSignatureData(result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // 完成签名
  const handleCompleteSignature = async () => {
    if (!signatureData) {
      alert("请先完成签名")
      return
    }

    setIsProcessing(true)

    try {
      const signatureRecord = ElectronicSignatureService.createSignatureRecord(
        signatureData,
        activeTab,
        "current_user",
        documentId,
      )

      await new Promise((resolve) => setTimeout(resolve, 1500))

      setSignatureRecords((prev) => [...prev, signatureRecord])

      if (onSignatureComplete) {
        onSignatureComplete(signatureRecord)
      }

      setSignatureData("")
      setTypedSignature("")
      setUploadedFile(null)
    } catch (error) {
      console.error("签名处理失败:", error)
      alert("签名处理失败，请重试")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isMobile ? "w-[95vw]" : ""}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <PenTool className="w-5 h-5" />
            <span>电子签名</span>
          </DialogTitle>
          <DialogDescription>请选择签名方式并完成签名</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="handwritten">
              <PenTool className="w-4 h-4 mr-2" />
              手写签名
            </TabsTrigger>
            <TabsTrigger value="typed">
              <FileText className="w-4 h-4 mr-2" />
              文字签名
            </TabsTrigger>
            <TabsTrigger value="uploaded">
              <Upload className="w-4 h-4 mr-2" />
              上传签名
            </TabsTrigger>
          </TabsList>

          <TabsContent value="handwritten">
            {isMobile ? (
              <MobileSignaturePad onSignatureChange={handleHandwrittenSignature} />
            ) : (
              <SignaturePad onSignatureChange={handleHandwrittenSignature} />
            )}
          </TabsContent>

          <TabsContent value="typed">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>签名文字</Label>
                <Input
                  placeholder="请输入您的姓名"
                  value={typedSignature}
                  onChange={(e) => handleTypedSignature(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>字体样式</Label>
                <Select value={selectedFont} onValueChange={setSelectedFont}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cursive">手写体</SelectItem>
                    <SelectItem value="serif">衬线体</SelectItem>
                    <SelectItem value="sans-serif">无衬线体</SelectItem>
                    <SelectItem value="monospace">等宽字体</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {typedSignature && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                  <p className="text-center" style={{ fontFamily: selectedFont, fontSize: "40px" }}>
                    {typedSignature}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="uploaded">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="signature-upload"
                />
                <Label htmlFor="signature-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">点击上传签名图片</p>
                  <p className="text-sm text-gray-400 mt-2">支持 PNG、JPG 格式</p>
                </Label>
              </div>
              {uploadedFile && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>已上传: {uploadedFile.name}</AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>签名将被加密存储，确保安全性和不可篡改性</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>时间戳: {new Date().toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Smartphone className="w-4 h-4" />
              <span>设备: {(() => {
                const info = ElectronicSignatureService.getDeviceInfo()
                return info.type === "mobile" ? "移动端" : info.type === "tablet" ? "平板" : "桌面端"
              })()}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleCompleteSignature} disabled={!signatureData || isProcessing}>
            {isProcessing ? (
              <>
                <Zap className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                确认签名
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 签名记录查看组件
export function SignatureHistory({
  signatures,
  onClose,
}: {
  signatures: SignatureRecord[]
  onClose?: () => void
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Fingerprint className="w-5 h-5" />
            <span>签名记录</span>
          </DialogTitle>
          <DialogDescription>查看所有电子签名记录</DialogDescription>
        </DialogHeader>

        {signatures.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无签名记录</div>
        ) : (
          <div className="space-y-4">
            {signatures.map((signature, index: number) => (
              <Card key={signature.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>签名 #{index + 1}</span>
                    <Badge
                      variant={
                        signature.status === "verified"
                          ? "default"
                          : signature.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {signature.status === "verified"
                        ? "已验证"
                        : signature.status === "failed"
                          ? "验证失败"
                          : "待验证"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>文档ID: {signature.documentId}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>用户ID: {signature.userId}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>签名时间: {new Date(signature.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Smartphone className="w-4 h-4" />
                      <span>设备类型: {signature.deviceInfo.type}</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Lock className="w-4 h-4" />
                      <span>签名哈希: {signature.hash.substring(0, 20)}...</span>
                    </div>
                  </div>
                  {signature.status === "verified" && ElectronicSignatureService.verifySignature(signature) ? (
                    <div className="mt-2 flex items-center space-x-1 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>签名完整性验证通过</span>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
