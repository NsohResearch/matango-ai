import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Search, 
  Star, 
  Download, 
  ShoppingCart, 
  Heart,
  Filter,
  Grid3X3,
  List,
  Play,
  Check,
  Loader2,
  Upload,
  Plus,
  TrendingUp,
  Clock,
  DollarSign,
  Sparkles
} from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All Categories", icon: Grid3X3 },
  { value: "social_media", label: "Social Media", icon: Sparkles },
  { value: "youtube", label: "YouTube", icon: Play },
  { value: "ads", label: "Ads", icon: TrendingUp },
  { value: "tutorials", label: "Tutorials", icon: Clock },
  { value: "presentations", label: "Presentations", icon: List },
  { value: "explainers", label: "Explainers", icon: Sparkles },
  { value: "testimonials", label: "Testimonials", icon: Star },
  { value: "promos", label: "Promos", icon: DollarSign },
  { value: "stories", label: "Stories", icon: Heart },
];

const SORT_OPTIONS = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Highest Rated" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
];

export default function TemplateMarketplace() {
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "rating" | "price_low" | "price_high">("popular");
  const [pricingFilter, setPricingFilter] = useState<"all" | "free" | "paid">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  // Fetch marketplace listings
  const { data: listingsData, isLoading } = trpc.marketplace.list.useQuery({
    category: category === "all" ? undefined : category,
    pricingType: pricingFilter === "all" ? undefined : pricingFilter,
    search: search || undefined,
    sortBy,
    limit: 24,
    offset: 0,
  });

  // Fetch featured templates
  const { data: featuredTemplates } = trpc.marketplace.featured.useQuery();

  // Fetch user's purchases
  const { data: myPurchases } = trpc.marketplace.myPurchases.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Fetch user's listings
  const { data: myListings } = trpc.marketplace.myListings.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Purchase mutation
  const purchaseMutation = trpc.marketplace.purchase.useMutation({
    onSuccess: (data) => {
      if (data.requiresPayment) {
        toast.info("Redirecting to payment...");
        // In production, redirect to Stripe checkout
      } else {
        toast.success("Template added to your library!");
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isPurchased = (listingId: number) => {
    return myPurchases?.some((p) => p.listingId === listingId);
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `$${(price / 100).toFixed(2)}`;
  };

  const formatRating = (rating: number) => {
    return (rating / 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Template Marketplace</h1>
          <p className="text-muted-foreground text-lg">
            Browse, purchase, and share professional video templates created by the community
          </p>
        </div>

        {/* Featured Section */}
        {featuredTemplates && featuredTemplates.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-semibold">Featured Templates</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredTemplates.slice(0, 4).map((template) => (
                <Card 
                  key={template.id} 
                  className="group cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedListing(template)}
                >
                  <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
                    {template.thumbnailUrl ? (
                      <img 
                        src={template.thumbnailUrl} 
                        alt={template.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                      Featured
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate">{template.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{template.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm">{formatRating(template.rating)}</span>
                      </div>
                      <span className="font-semibold text-primary">
                        {formatPrice(template.price)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Tabs for Browse / My Purchases / My Listings */}
        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList>
            <TabsTrigger value="browse">Browse All</TabsTrigger>
            {isAuthenticated && (
              <>
                <TabsTrigger value="purchases">My Purchases</TabsTrigger>
                <TabsTrigger value="listings">My Listings</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={pricingFilter} onValueChange={(v) => setPricingFilter(v as any)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Price" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  variant={category === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(cat.value)}
                  className="gap-2"
                >
                  <cat.icon className="w-4 h-4" />
                  {cat.label}
                </Button>
              ))}
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : listingsData?.listings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No templates found matching your criteria</p>
              </div>
            ) : (
              <div className={viewMode === "grid" 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
                : "space-y-4"
              }>
                {listingsData?.listings.map((listing) => (
                  <Card 
                    key={listing.id}
                    className={`group cursor-pointer hover:border-primary/50 transition-colors ${
                      viewMode === "list" ? "flex" : ""
                    }`}
                    onClick={() => setSelectedListing(listing)}
                  >
                    <div className={`relative ${viewMode === "list" ? "w-48 shrink-0" : "aspect-video"} bg-muted rounded-t-lg overflow-hidden`}>
                      {listing.thumbnailUrl ? (
                        <img 
                          src={listing.thumbnailUrl} 
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      {listing.pricingType === "free" && (
                        <Badge className="absolute top-2 left-2 bg-green-500">Free</Badge>
                      )}
                      {listing.isFeatured && (
                        <Badge className="absolute top-2 right-2 bg-primary">Featured</Badge>
                      )}
                    </div>
                    <div className={viewMode === "list" ? "flex-1 p-4" : ""}>
                      <CardContent className={viewMode === "list" ? "p-0" : "p-4"}>
                        <h3 className="font-semibold truncate">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">{listing.description}</p>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{listing.category}</Badge>
                          <span>by {listing.sellerName || "Anonymous"}</span>
                        </div>
                      </CardContent>
                      <CardFooter className={`flex items-center justify-between ${viewMode === "list" ? "p-0 pt-2" : "p-4 pt-0"}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm">{formatRating(listing.rating)}</span>
                            <span className="text-xs text-muted-foreground">({listing.reviewCount})</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Download className="w-4 h-4" />
                            <span className="text-sm">{listing.downloads}</span>
                          </div>
                        </div>
                        <span className="font-semibold text-primary">
                          {formatPrice(listing.price)}
                        </span>
                      </CardFooter>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Load More */}
            {listingsData?.hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="outline">Load More</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="purchases" className="space-y-6">
            {!myPurchases || myPurchases.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
                <p className="text-muted-foreground mb-4">
                  Browse the marketplace to find templates for your projects
                </p>
                <Button onClick={() => (document.querySelector('[value="browse"]') as HTMLElement)?.click()}>
                  Browse Templates
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {myPurchases.map((purchase) => (
                  <Card key={purchase.id}>
                    <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
                      {purchase.thumbnailUrl ? (
                        <img 
                          src={purchase.thumbnailUrl} 
                          alt={purchase.title || "Template"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <Badge className="absolute top-2 left-2 bg-green-500">
                        <Check className="w-3 h-3 mr-1" />
                        Owned
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold truncate">{purchase.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Purchased {new Date(purchase.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                      <Button className="w-full" variant="outline">
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="listings" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Published Templates</h2>
              <Button onClick={() => setShowPublishDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Publish Template
              </Button>
            </div>

            {!myListings || myListings.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                <p className="text-muted-foreground mb-4">
                  Share your templates with the community and earn from your creations
                </p>
                <Button onClick={() => setShowPublishDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Publish Your First Template
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {myListings.map((listing) => (
                  <Card key={listing.id}>
                    <div className="relative aspect-video bg-muted rounded-t-lg overflow-hidden">
                      {listing.thumbnailUrl ? (
                        <img 
                          src={listing.thumbnailUrl} 
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="w-12 h-12 text-muted-foreground" />
                        </div>
                      )}
                      <Badge 
                        className={`absolute top-2 left-2 ${
                          listing.status === "approved" ? "bg-green-500" :
                          listing.status === "pending_review" ? "bg-yellow-500" :
                          listing.status === "rejected" ? "bg-red-500" :
                          "bg-gray-500"
                        }`}
                      >
                        {listing.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold truncate">{listing.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          <span>{listing.downloads}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          <span>{formatRating(listing.rating)}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Analytics
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Template Detail Dialog */}
        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent className="max-w-3xl">
            {selectedListing && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedListing.title}</DialogTitle>
                  <DialogDescription>
                    by {selectedListing.sellerName || "Anonymous"}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Preview */}
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    {selectedListing.previewVideoUrl ? (
                      <video 
                        src={selectedListing.previewVideoUrl}
                        controls
                        className="w-full h-full object-cover"
                      />
                    ) : selectedListing.thumbnailUrl ? (
                      <img 
                        src={selectedListing.thumbnailUrl}
                        alt={selectedListing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-16 h-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{selectedListing.category}</Badge>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span>{formatRating(selectedListing.rating)}</span>
                      <span className="text-muted-foreground">
                        ({selectedListing.reviewCount} reviews)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Download className="w-4 h-4" />
                      <span>{selectedListing.downloads} downloads</span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-muted-foreground">
                      {selectedListing.longDescription || selectedListing.description || "No description provided."}
                    </p>
                  </div>

                  {/* Tags */}
                  {selectedListing.tags && selectedListing.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedListing.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(selectedListing.price)}
                  </span>
                  {isPurchased(selectedListing.id) ? (
                    <Button disabled>
                      <Check className="w-4 h-4 mr-2" />
                      Already Owned
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => {
                        if (!isAuthenticated) {
                          toast.error("Please log in to purchase templates");
                          return;
                        }
                        purchaseMutation.mutate({ listingId: selectedListing.id });
                      }}
                      disabled={purchaseMutation.isPending}
                    >
                      {purchaseMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : selectedListing.pricingType === "free" ? (
                        <Download className="w-4 h-4 mr-2" />
                      ) : (
                        <ShoppingCart className="w-4 h-4 mr-2" />
                      )}
                      {selectedListing.pricingType === "free" ? "Get Free" : "Purchase"}
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Publish Template Dialog */}
        <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish Template to Marketplace</DialogTitle>
              <DialogDescription>
                Share your template with the community. Templates are reviewed before being published.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                To publish a template, first create it in Video Studio Pro, then return here to list it on the marketplace.
              </p>
              <Button 
                className="w-full"
                onClick={() => {
                  setShowPublishDialog(false);
                  toast.info("Feature coming soon: Direct template publishing from Video Studio");
                }}
              >
                Go to Video Studio Pro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
