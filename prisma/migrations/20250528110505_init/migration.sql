-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brands" (
    "id" SERIAL NOT NULL,
    "shop" TEXT,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "availability" TEXT NOT NULL,
    "image" TEXT,
    "imageId" TEXT,
    "collectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT,
    "pageLayout" TEXT NOT NULL,
    "colourScheme" TEXT NOT NULL,
    "featuredCarousel" TEXT NOT NULL,
    "scrollPage" TEXT NOT NULL,
    "disabledLetters" TEXT NOT NULL,
    "letterSpace" TEXT NOT NULL,
    "searchBar" TEXT NOT NULL,
    "scrollTop" TEXT NOT NULL,
    "productVendors" BOOLEAN NOT NULL,
    "smartCollections" BOOLEAN NOT NULL,
    "customCollections" BOOLEAN NOT NULL,
    "defaultStatus" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL,
    "seoUrlHandle" TEXT NOT NULL,
    "searchPlaceholder" TEXT NOT NULL,
    "noResultsTitle" TEXT NOT NULL,
    "noResultsDescription" TEXT NOT NULL,
    "customCSS" TEXT NOT NULL,
    "offsetClass" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandSettings_shop_key" ON "BrandSettings"("shop");
