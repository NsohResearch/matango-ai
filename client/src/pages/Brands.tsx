import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Building2, Plus, Copy, Archive, CheckCircle2, Edit, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { AppFooter } from "@/components/layout/AppFooter";

export default function Brands() {
  const [, setLocation] = useLocation();
  const [newBrandName, setNewBrandName] = useState("");
  const [duplicateName, setDuplicateName] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);

  const { data, isLoading, refetch } = trpc.brandBrain.listBrands.useQuery();
  
  const createBrand = trpc.brandBrain.createBrand.useMutation({
    onSuccess: (result) => {
      refetch();
      setIsCreateOpen(false);
      setNewBrandName("");
      // Navigate to brand brain to complete setup
      setLocation(`/brand-brain?brandId=${result.id}`);
    },
  });

  const setActiveBrand = trpc.brandBrain.setActiveBrand.useMutation({
    onSuccess: () => refetch(),
  });

  const archiveBrand = trpc.brandBrain.archiveBrand.useMutation({
    onSuccess: () => refetch(),
  });

  const duplicateBrand = trpc.brandBrain.duplicateBrand.useMutation({
    onSuccess: () => {
      refetch();
      setIsDuplicateOpen(false);
      setDuplicateName("");
      setSelectedBrandId(null);
    },
  });

  const brands = data?.brands || [];
  const organization = data?.organization;
  const activeBrandId = organization?.activeBrandId;
  const maxBrands = organization?.maxBrands || 1;
  const canAddBrand = maxBrands === -1 || brands.length < maxBrands;
  const plan = organization?.plan || "free";

  const planLimits: Record<string, number> = {
    free: 1,
    basic: 3,
    agency: 20,
    agency_plus: -1,
  };

  const handleCreateBrand = () => {
    if (!newBrandName.trim()) return;
    createBrand.mutate({ productName: newBrandName, brandName: newBrandName });
  };

  const handleDuplicateBrand = () => {
    if (!duplicateName.trim() || !selectedBrandId) return;
    duplicateBrand.mutate({ brandId: selectedBrandId, newBrandName: duplicateName });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-800 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Brand Management</h1>
            <p className="text-gray-400">
              Manage multiple brands from one dashboard. Each brand has its own Brand Brain, campaigns, and content.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-gray-400 border-gray-600">
              {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
            </Badge>
            <Badge className="bg-emerald-500/20 text-emerald-400">
              {brands.length}/{maxBrands === -1 ? "∞" : maxBrands} Brands
            </Badge>
          </div>
        </div>

        {/* Plan Upgrade Banner */}
        {!canAddBrand && (
          <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30 mb-8">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-amber-400">Brand Limit Reached</h3>
                  <p className="text-gray-400">
                    Upgrade to {plan === "free" ? "Basic (3 brands)" : "Agency (unlimited brands)"} to add more brands.
                  </p>
                </div>
                <Link href="/pricing">
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                    Upgrade Plan
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Brands Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Brand Card */}
          {canAddBrand && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Card className="bg-gray-900/50 border-dashed border-gray-700 hover:border-emerald-500/50 cursor-pointer transition-all group">
                  <CardContent className="flex flex-col items-center justify-center h-48 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                      <Plus className="h-6 w-6 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">Create New Brand</h3>
                    <p className="text-sm text-gray-500">Add another brand to your portfolio</p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Brand</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Start with a brand name. You'll complete the Brand Brain setup next.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="brandName" className="text-gray-300">Brand Name</Label>
                  <Input
                    id="brandName"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="e.g., Acme Corp"
                    className="mt-2 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={handleCreateBrand}
                    disabled={!newBrandName.trim() || createBrand.isPending}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    {createBrand.isPending ? "Creating..." : "Create Brand"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Existing Brands */}
          {brands.map((brand: any) => (
            <Card 
              key={brand.id} 
              className={`bg-gray-900 border-gray-700 ${brand.id === activeBrandId ? "ring-2 ring-emerald-500/50" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">
                        {brand.brandName || brand.productName}
                      </CardTitle>
                      {brand.category && (
                        <CardDescription className="text-gray-500">{brand.category}</CardDescription>
                      )}
                    </div>
                  </div>
                  {brand.id === activeBrandId && (
                    <Badge className="bg-emerald-500/20 text-emerald-400">Active</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className={`text-xs ${brand.isComplete ? "border-emerald-500/50 text-emerald-400" : "border-amber-500/50 text-amber-400"}`}>
                    {brand.isComplete ? "Complete" : `${brand.completionScore || 0}% Setup`}
                  </Badge>
                  {brand.websiteUrl && (
                    <a href={brand.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-300">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {brand.id !== activeBrandId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveBrand.mutate({ brandId: brand.id })}
                      className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Set Active
                    </Button>
                  )}
                  
                  <Link href={`/brand-brain?brandId=${brand.id}`}>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  
                  <Dialog open={isDuplicateOpen && selectedBrandId === brand.id} onOpenChange={(open) => {
                    setIsDuplicateOpen(open);
                    if (open) setSelectedBrandId(brand.id);
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white" disabled={!canAddBrand}>
                        <Copy className="h-3 w-3 mr-1" />
                        Duplicate
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-900 border-gray-700">
                      <DialogHeader>
                        <DialogTitle className="text-white">Duplicate Brand</DialogTitle>
                        <DialogDescription className="text-gray-400">
                          Create a copy of "{brand.brandName || brand.productName}" with a new name.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Label htmlFor="duplicateName" className="text-gray-300">New Brand Name</Label>
                        <Input
                          id="duplicateName"
                          value={duplicateName}
                          onChange={(e) => setDuplicateName(e.target.value)}
                          placeholder={`${brand.brandName || brand.productName} (Copy)`}
                          className="mt-2 bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDuplicateOpen(false)}>Cancel</Button>
                        <Button 
                          onClick={handleDuplicateBrand}
                          disabled={!duplicateName.trim() || duplicateBrand.isPending}
                          className="bg-emerald-500 hover:bg-emerald-600"
                        >
                          {duplicateBrand.isPending ? "Duplicating..." : "Duplicate"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  {brand.id !== activeBrandId && brands.length > 1 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                          <Archive className="h-3 w-3 mr-1" />
                          Archive
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-900 border-gray-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Archive Brand?</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            This will archive "{brand.brandName || brand.productName}". Archived brands are hidden but can be restored later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => archiveBrand.mutate({ brandId: brand.id })}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Archive
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {brands.length === 0 && (
          <Card className="bg-gray-900/50 border-gray-700 mt-8">
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Brands Yet</h3>
              <p className="text-gray-400 mb-6">Create your first brand to get started with Matango.ai</p>
              <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-500 hover:bg-emerald-600">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Brand
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
