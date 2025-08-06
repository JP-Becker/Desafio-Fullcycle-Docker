FROM golang:1.21-alpine AS builder
RUN apk add --no-cache upx
WORKDIR /app
COPY main.go .
RUN CGO_ENABLED=0 go build -a -gcflags=all="-l -B" -ldflags="-w -s" -trimpath -o fullcycle main.go
RUN upx --best --lzma fullcycle

FROM scratch
COPY --from=builder /app/fullcycle /fullcycle
ENTRYPOINT ["/fullcycle"]